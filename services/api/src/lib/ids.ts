import { randomBytes } from "node:crypto";

export const newBmfId = () => `bmf_${randomBytes(8).toString("hex")}`;

const PALETTE = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#f43f5e", "#8b5cf6", "#06b6d4", "#64748b"];

export function colorFor(seed: string): string {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}
