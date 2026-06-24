import { Router } from "express";
import { z } from "zod";
import { Types } from "mongoose";
import { ChatModel } from "../models/Chat.js";
import { MessageModel, publicMessage } from "../models/Message.js";
import { UserModel, publicUser, type UserDoc } from "../models/User.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";

export const chatsRouter = Router();
chatsRouter.use(requireAuth);

/** Найти-или-создать чат «Избранное» (заметки самому себе). */
export async function ensureFavorites(meId: string) {
  let chat = await ChatModel.findOne({ type: "saved", members: meId });
  if (!chat) {
    chat = await ChatModel.create({ type: "saved", members: [new Types.ObjectId(meId)], name: "Избранное", avatarColor: "#f59e0b" });
  }
  return chat;
}

/** Сериализация чата для клиента: для DM имя/аватар берём у собеседника. */
export async function serializeChat(chat: any, meId: string) {
  const members = (await UserModel.find({ _id: { $in: chat.members } })) as UserDoc[];
  let name: string = chat.name;
  let avatarColor: string = chat.avatarColor;
  if (chat.type === "dm") {
    const other = members.find((m) => m._id.toString() !== meId) ?? members[0];
    name = other ? other.displayName || other.username : "Чат";
    avatarColor = other?.avatarColor ?? "#6366f1";
  } else if (chat.type === "saved") {
    name = "Избранное";
    avatarColor = "#f59e0b";
  }
  return {
    id: chat._id.toString(),
    type: chat.type as "dm" | "group",
    name,
    avatarColor,
    members: members.map(publicUser),
    lastMessage: chat.lastMessage?.at
      ? { text: chat.lastMessage.text as string, at: chat.lastMessage.at as Date }
      : null,
    updatedAt: chat.updatedAt as Date
  };
}

chatsRouter.get("/", async (req: AuthedRequest, res) => {
  await ensureFavorites(req.userId!);
  const chats = await ChatModel.find({ members: req.userId }).sort({ updatedAt: -1 });
  // «Избранное» всегда первым.
  chats.sort((a, b) => (a.type === "saved" ? -1 : b.type === "saved" ? 1 : 0));
  res.json({ chats: await Promise.all(chats.map((c) => serializeChat(c, req.userId!))) });
});

const dmSchema = z.object({ username: z.string() });

chatsRouter.post("/dm", async (req: AuthedRequest, res) => {
  const parsed = dmSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_input" });
    return;
  }
  const other = await UserModel.findOne({ username: parsed.data.username.toLowerCase() });
  if (!other) {
    res.status(404).json({ error: "user_not_found" });
    return;
  }
  if (other._id.toString() === req.userId) {
    res.status(400).json({ error: "cannot_dm_self" });
    return;
  }
  let chat = await ChatModel.findOne({
    type: "dm",
    members: { $all: [req.userId, other._id], $size: 2 }
  });
  if (!chat) {
    chat = await ChatModel.create({ type: "dm", members: [new Types.ObjectId(req.userId), other._id] });
  }
  res.json({ chat: await serializeChat(chat, req.userId!) });
});

chatsRouter.get("/:id/messages", async (req: AuthedRequest, res) => {
  const chat = await ChatModel.findOne({ _id: req.params.id, members: req.userId });
  if (!chat) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  const msgs = await MessageModel.find({ chatId: chat._id }).sort({ createdAt: 1 }).limit(200);
  res.json({ messages: msgs.map(publicMessage) });
});
