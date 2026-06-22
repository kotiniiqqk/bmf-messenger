import { Schema, model } from "mongoose";
const messageSchema = new Schema({
    chatId: { type: Schema.Types.ObjectId, ref: "Chat", required: true, index: true },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, default: "" }
}, { timestamps: true });
export const MessageModel = model("Message", messageSchema);
export function publicMessage(m) {
    return {
        id: m._id.toString(),
        chatId: m.chatId.toString(),
        senderId: m.senderId.toString(),
        text: m.text,
        createdAt: m.createdAt
    };
}
