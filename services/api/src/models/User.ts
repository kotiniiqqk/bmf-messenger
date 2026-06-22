import { Schema, model, InferSchemaType, Types } from "mongoose";

const userSchema = new Schema(
  {
    bmfId: { type: String, required: true, unique: true, index: true },
    username: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    email: { type: String, required: true },
    displayName: { type: String, default: "" },
    passwordHash: { type: String, required: true, select: false },
    avatarColor: { type: String, default: "#6366f1" }
  },
  { timestamps: true }
);

export type UserDoc = InferSchemaType<typeof userSchema> & { _id: Types.ObjectId };
export const UserModel = model("User", userSchema);

/** Публичное представление пользователя (без секрета). */
export function publicUser(u: UserDoc) {
  return {
    id: u._id.toString(),
    bmfId: u.bmfId,
    username: u.username,
    email: u.email,
    displayName: u.displayName || u.username,
    avatarColor: u.avatarColor
  };
}
