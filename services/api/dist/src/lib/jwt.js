import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
export const signToken = (p) => jwt.sign(p, env.JWT_SECRET, { expiresIn: "30d" });
export const verifyToken = (t) => jwt.verify(t, env.JWT_SECRET);
