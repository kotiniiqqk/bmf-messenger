import crypto from "node:crypto";
import { env } from "../config/env.js";

// Симметричное шифрование секрета почтового ящика (пароль = пароль мессенджера,
// но в БД мы храним только bcrypt-хеш, поэтому для доступа к IMAP/JMAP храним
// отдельную обратимо-зашифрованную копию). Ключ выводим из JWT_SECRET.
const KEY = crypto.scryptSync(env.JWT_SECRET, "bmf-mail-secret", 32);

export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), enc.toString("base64")].join(":");
}

export function decryptSecret(blob: string): string {
  const [ivB64, tagB64, encB64] = blob.split(":");
  const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(encB64, "base64")), decipher.final()]).toString("utf8");
}
