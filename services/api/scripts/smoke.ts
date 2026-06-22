/* Сквозной smoke-тест ядра: register/login/me/dm/realtime/history.
   Поднимает in-memory Mongo, реальный HTTP+Socket.io, гоняет сценарий. */
import { MongoMemoryServer } from "mongodb-memory-server";
import { createServer } from "node:http";
import { io as ioClient, type Socket } from "socket.io-client";
import { connectDB } from "../src/db.js";
import { buildApp } from "../src/app.js";
import { attachRealtime } from "../src/socket/index.js";

const PORT = 8123;
const base = `http://127.0.0.1:${PORT}`;

async function jpost(path: string, body: unknown, token?: string) {
  const r = await fetch(base + path, {
    method: "POST",
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body)
  });
  return { status: r.status, body: (await r.json().catch(() => ({}))) as any };
}
async function jget(path: string, token?: string) {
  const r = await fetch(base + path, { headers: token ? { authorization: `Bearer ${token}` } : {} });
  return { status: r.status, body: (await r.json().catch(() => ({}))) as any };
}
function onceConnect(s: Socket) {
  return new Promise<void>((res, rej) => {
    s.on("connect", () => res());
    s.on("connect_error", (e) => rej(e));
  });
}

async function main() {
  const mem = await MongoMemoryServer.create();
  await connectDB(mem.getUri());
  const http = createServer(buildApp());
  attachRealtime(http);
  await new Promise<void>((res) => http.listen(PORT, res));

  const fail = (m: string): never => {
    console.error("❌ FAIL:", m);
    process.exit(1);
  };

  const a = await jpost("/auth/register", { username: "alice", password: "secret123", displayName: "Alice" });
  if (a.status !== 200 || !a.body.token) fail("register alice " + JSON.stringify(a));
  const b = await jpost("/auth/register", { username: "bob", password: "secret123" });
  if (b.status !== 200 || !b.body.token) fail("register bob");

  const dup = await jpost("/auth/register", { username: "alice", password: "secret123" });
  if (dup.status !== 409) fail("duplicate username должен дать 409, дал " + dup.status);

  const lg = await jpost("/auth/login", { username: "alice", password: "secret123" });
  if (lg.status !== 200 || !lg.body.token) fail("login alice");
  const tokenA = lg.body.token as string;
  const tokenB = b.body.token as string;

  const badLg = await jpost("/auth/login", { username: "alice", password: "wrong" });
  if (badLg.status !== 401) fail("неверный пароль должен дать 401");

  const me = await jget("/auth/me", tokenA);
  if (me.status !== 200 || me.body.user.username !== "alice") fail("me");
  if (me.body.user.email !== "alice@bmf.ink") fail("email должен быть alice@bmf.ink");

  const dm = await jpost("/chats/dm", { username: "bob" }, tokenA);
  if (dm.status !== 200 || !dm.body.chat?.id) fail("dm " + JSON.stringify(dm));
  const chatId = dm.body.chat.id as string;

  // идемпотентность DM
  const dm2 = await jpost("/chats/dm", { username: "bob" }, tokenA);
  if (dm2.body.chat?.id !== chatId) fail("повторный DM должен вернуть тот же чат");

  // realtime: bob слушает, alice шлёт
  const sockB = ioClient(base, { auth: { token: tokenB }, transports: ["websocket"] });
  const sockA = ioClient(base, { auth: { token: tokenA }, transports: ["websocket"] });
  const received = new Promise<any>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("сообщение не пришло за 4с")), 4000);
    sockB.on("message:new", (m) => {
      clearTimeout(t);
      resolve(m);
    });
  });
  await Promise.all([onceConnect(sockA), onceConnect(sockB)]);
  sockA.emit("message:send", { chatId, text: "привет, Боб!" });

  const msg = await received;
  if (msg.text !== "привет, Боб!") fail("текст сообщения не совпал");

  const hist = await jget(`/chats/${chatId}/messages`, tokenB);
  if (hist.status !== 200 || hist.body.messages.length !== 1) fail("история сообщений");

  console.log("✅ SMOKE OK: register / login / me / dm / realtime / history");
  sockA.close();
  sockB.close();
  http.close();
  await mem.stop();
  process.exit(0);
}

main().catch((e) => {
  console.error("❌", e);
  process.exit(1);
});
