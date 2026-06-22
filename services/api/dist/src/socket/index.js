import { Server } from "socket.io";
import { verifyToken } from "../lib/jwt.js";
import { ChatModel } from "../models/Chat.js";
import { MessageModel, publicMessage } from "../models/Message.js";
import { env } from "../config/env.js";
const online = new Set();
export const isOnline = (id) => online.has(id);
export function attachRealtime(httpServer) {
    const io = new Server(httpServer, {
        cors: { origin: env.CLIENT_ORIGINS, credentials: true }
    });
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token;
        if (!token)
            return next(new Error("unauthorized"));
        try {
            const p = verifyToken(token);
            socket.data.userId = p.sub;
            socket.data.username = p.username;
            next();
        }
        catch {
            next(new Error("invalid_token"));
        }
    });
    io.on("connection", (socket) => {
        const userId = socket.data.userId;
        socket.join(`user:${userId}`);
        online.add(userId);
        io.emit("presence:update", { userId, online: true });
        socket.on("message:send", async (payload, ack) => {
            try {
                const text = (payload?.text ?? "").trim();
                if (!text)
                    return ack?.({ ok: false, error: "empty" });
                const chat = await ChatModel.findOne({ _id: payload.chatId, members: userId });
                if (!chat)
                    return ack?.({ ok: false, error: "no_chat" });
                const msg = await MessageModel.create({ chatId: chat._id, senderId: userId, text });
                chat.set("lastMessage", { text, at: new Date(), senderId: msg.senderId });
                await chat.save();
                const out = publicMessage(msg);
                for (const m of chat.members)
                    io.to(`user:${m.toString()}`).emit("message:new", out);
                ack?.({ ok: true, message: out });
            }
            catch {
                ack?.({ ok: false, error: "server" });
            }
        });
        socket.on("disconnect", () => {
            online.delete(userId);
            io.emit("presence:update", { userId, online: false });
        });
    });
    return io;
}
