import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export interface TokenPayload {
  sub: string; // userId
  username: string;
}

export const signToken = (p: TokenPayload) => jwt.sign(p, env.JWT_SECRET, { expiresIn: "30d" });

export const verifyToken = (t: string) =>
  jwt.verify(t, env.JWT_SECRET) as TokenPayload & { iat: number; exp: number };
