import { Router } from "express";
import { z } from "zod";
import { UserModel } from "../models/User.js";
import { verifyPassword } from "../lib/password.js";
import { encryptSecret, decryptSecret } from "../lib/crypto.js";
import { createMailbox, listInbox, getEmail, sendEmail } from "../lib/stalwart.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { env } from "../config/env.js";

export const mailRouter = Router();
mailRouter.use(requireAuth);

/** Загрузить пользователя вместе с секретом почты. */
async function loadWithSecret(userId: string) {
  return UserModel.findById(userId).select("+mailSecretEnc");
}

/** Статус почты пользователя. */
mailRouter.get("/status", async (req: AuthedRequest, res) => {
  const user = await UserModel.findById(req.userId);
  if (!user) return void res.status(404).json({ error: "not_found" });
  res.json({ enabled: Boolean(user.mailEnabled), address: user.email, available: env.MAIL_ENABLED });
});

/** Подключить почту: создать ящик в Stalwart с паролем мессенджера. */
const connectSchema = z.object({ password: z.string().min(1) });
mailRouter.post("/connect", async (req: AuthedRequest, res) => {
  if (!env.MAIL_ENABLED) return void res.status(503).json({ error: "mail_unavailable" });
  const parsed = connectSchema.safeParse(req.body);
  if (!parsed.success) return void res.status(400).json({ error: "invalid_input" });

  const user = await UserModel.findById(req.userId).select("+passwordHash +mailSecretEnc");
  if (!user) return void res.status(404).json({ error: "not_found" });
  if (!(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return void res.status(401).json({ error: "invalid_credentials" });
  }

  try {
    await createMailbox(user.username, user.email, parsed.data.password, user.displayName);
    user.mailSecretEnc = encryptSecret(parsed.data.password);
    user.mailEnabled = true;
    await user.save();
    res.json({ ok: true, address: user.email });
  } catch (e) {
    res.status(502).json({ error: "stalwart_error", detail: String(e instanceof Error ? e.message : e) });
  }
});

/** Креды почты пользователя или null. */
async function mailCreds(userId: string) {
  const user = await loadWithSecret(userId);
  if (!user || !user.mailEnabled || !user.mailSecretEnc) return null;
  return { login: user.username, email: user.email, password: decryptSecret(user.mailSecretEnc) };
}

/** Список входящих. */
mailRouter.get("/", async (req: AuthedRequest, res) => {
  const creds = await mailCreds(req.userId!);
  if (!creds) return void res.status(409).json({ error: "mail_not_connected" });
  try {
    res.json({ messages: await listInbox(creds, 30) });
  } catch (e) {
    res.status(502).json({ error: "stalwart_error", detail: String(e instanceof Error ? e.message : e) });
  }
});

/** Отправить письмо. */
const sendSchema = z.object({
  to: z.string().email(),
  subject: z.string().max(255).default(""),
  text: z.string().max(50000).default("")
});
mailRouter.post("/send", async (req: AuthedRequest, res) => {
  const creds = await mailCreds(req.userId!);
  if (!creds) return void res.status(409).json({ error: "mail_not_connected" });
  const parsed = sendSchema.safeParse(req.body);
  if (!parsed.success) return void res.status(400).json({ error: "invalid_input" });
  try {
    await sendEmail(creds, parsed.data);
    res.json({ ok: true });
  } catch (e) {
    res.status(502).json({ error: "stalwart_error", detail: String(e instanceof Error ? e.message : e) });
  }
});

/** Одно письмо (полный текст). Держать последним — :id перехватывает всё. */
mailRouter.get("/:id", async (req: AuthedRequest, res) => {
  const creds = await mailCreds(req.userId!);
  if (!creds) return void res.status(409).json({ error: "mail_not_connected" });
  try {
    res.json({ message: await getEmail(creds, req.params.id) });
  } catch (e) {
    res.status(502).json({ error: "stalwart_error", detail: String(e instanceof Error ? e.message : e) });
  }
});
