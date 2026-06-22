import { Schema, model, InferSchemaType, Types } from "mongoose";

const messageSchema = new Schema(
  {
    chatId: { type: Schema.Types.ObjectId, ref: "Chat", required: true, index: true },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, default: "" }
  },
  { timestamps: true }
);

export type MessageDoc = InferSchemaType<typeof messageSchema> & { _id: Types.ObjectId };
export const MessageModel = model("Message", messageSchema);

export function publicMessage(m: MessageDoc) {
  return {
    id: m._id.toString(),
    chatId: m.chatId.toString(),
    senderId: m.senderId.toString(),
    text: m.text,
    createdAt: (m as MessageDoc & { createdAt: Date }).createdAt
  };
}
