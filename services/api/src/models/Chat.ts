import { Schema, model, InferSchemaType, Types } from "mongoose";

const chatSchema = new Schema(
  {
    type: { type: String, enum: ["dm", "group"], default: "dm" },
    members: [{ type: Schema.Types.ObjectId, ref: "User", index: true }],
    name: { type: String, default: "" },
    avatarColor: { type: String, default: "#6366f1" },
    lastMessage: {
      text: { type: String, default: "" },
      at: { type: Date },
      senderId: { type: Schema.Types.ObjectId, ref: "User" }
    }
  },
  { timestamps: true }
);

export type ChatDoc = InferSchemaType<typeof chatSchema> & { _id: Types.ObjectId };
export const ChatModel = model("Chat", chatSchema);
