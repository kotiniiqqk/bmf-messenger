import type { Server as HttpServer } from "node:http";
import { Server, type Socket } from "socket.io";
import { verifyToken } from "../lib/jwt.js";
import { ChatModel } from "../models/Chat.js";
import { MessageModel, publicMessage } from "../models/Message.js";
import { env } from "../config/env.js";

const online = new Set<string>();
export const isOnline = (id: string) => online.has(id);

const callRoom = (chatId: string) => `call:${chatId}`;

/** Проверяет, что пользователь состоит в чате (авторизация сообщений и звонков). */
async function isMember(chatId: string, userId: string): Promise<boolean> {
  try {
    const chat = await ChatModel.findOne({ _id: chatId, members: userId }).select("_id");
    return Boolean(chat);
  } catch {
    return false;
  }
}

export function attachRealtime(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: { origin: env.CLIENT_ORIGINS, credentials: true }
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error("unauthorized"));
    try {
      const p = verifyToken(token);
      socket.data.userId = p.sub;
      socket.data.username = p.username;
      socket.data.callChats = new Set<string>();
      next();
    } catch {
      next(new Error("invalid_token"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const userId = socket.data.userId as string;
    const username = socket.data.username as string;
    socket.join(`user:${userId}`);
    online.add(userId);
    io.emit("presence:update", { userId, online: true });

    // ── Чат: отправка сообщения с реалтайм-рассылкой участникам ──
    socket.on(
      "message:send",
      async (payload: { chatId: string; text: string }, ack?: (r: unknown) => void) => {
        try {
          const text = (payload?.text ?? "").trim();
          if (!text) return ack?.({ ok: false, error: "empty" });
          const chat = await ChatModel.findOne({ _id: payload.chatId, members: userId });
          if (!chat) return ack?.({ ok: false, error: "no_chat" });

          const msg = await MessageModel.create({ chatId: chat._id, senderId: userId, text });
          chat.set("lastMessage", { text, at: new Date(), senderId: msg.senderId });
          await chat.save();

          const out = publicMessage(msg);
          for (const m of chat.members) io.to(`user:${m.toString()}`).emit("message:new", out);
          ack?.({ ok: true, message: out });
        } catch {
          ack?.({ ok: false, error: "server" });
        }
      }
    );

    // ── Звонки (WebRTC mesh): сервер только ретранслирует SDP/ICE, медиа его не касается ──

    function leaveCall(chatId: string) {
      const room = callRoom(chatId);
      socket.to(room).emit("call:peer-left", { socketId: socket.id });
      socket.leave(room);
      (socket.data.callChats as Set<string>).delete(chatId);
    }

    // Войти в звонок чата. В ack — текущие участники (newcomer инициирует offer'ы к ним).
    socket.on(
      "call:join",
      async (payload: { chatId: string }, ack?: (r: unknown) => void) => {
        const chatId = payload?.chatId;
        if (!chatId || !(await isMember(chatId, userId))) {
          return ack?.({ ok: false, error: "no_chat" });
        }
        const room = callRoom(chatId);
        const existing = await io.in(room).fetchSockets();
        const peers = existing
          .filter((s) => s.id !== socket.id)
          .map((s) => ({
            socketId: s.id,
            userId: s.data.userId as string,
            username: s.data.username as string
          }));

        await socket.join(room);
        (socket.data.callChats as Set<string>).add(chatId);

        // Уже находящимся в звонке — сообщаем о новом участнике.
        socket.to(room).emit("call:peer-joined", { socketId: socket.id, userId, username });

        // Звоним остальным участникам чата, которые ещё не в звонке.
        try {
          const chat = await ChatModel.findOne({ _id: chatId }).select("members");
          const inCall = new Set(existing.map((s) => s.data.userId as string));
          inCall.add(userId);
          for (const m of chat?.members ?? []) {
            const mid = m.toString();
            if (!inCall.has(mid)) {
              io.to(`user:${mid}`).emit("call:incoming", { chatId, from: { userId, username } });
            }
          }
        } catch {
          /* ignore ring errors */
        }

        ack?.({ ok: true, peers });
      }
    );

    // Ретрансляция сигналинга конкретному пиру (offer/answer/ICE).
    socket.on("call:signal", (payload: { to: string; data: unknown }) => {
      if (!payload?.to) return;
      io.to(payload.to).emit("call:signal", {
        from: socket.id,
        userId,
        username,
        data: payload.data
      });
    });

    // Состояние медиа (микрофон/камера/экран) — для индикаторов у других участников.
    socket.on("call:media", (payload: { chatId: string; state: unknown }) => {
      if (!payload?.chatId) return;
      socket.to(callRoom(payload.chatId)).emit("call:peer-media", {
        socketId: socket.id,
        state: payload.state
      });
    });

    // Выйти из звонка.
    socket.on("call:leave", (payload: { chatId: string }) => {
      if (payload?.chatId) leaveCall(payload.chatId);
    });

    socket.on("disconnect", () => {
      online.delete(userId);
      io.emit("presence:update", { userId, online: false });
      for (const chatId of socket.data.callChats as Set<string>) {
        socket.to(callRoom(chatId)).emit("call:peer-left", { socketId: socket.id });
      }
    });
  });

  return io;
}
