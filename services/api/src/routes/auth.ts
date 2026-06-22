import { Router } from "express";
import { z } from "zod";
import { UserModel, publicUser } from "../models/User.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { signToken } from "../lib/jwt.js";
import { newBmfId, colorFor } from "../lib/ids.js";
import { env } from "../config/env.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";

export const authRouter = Router();

const registerSchema = z.object({
  username: z.string().min(3).max(24).regex(/^[a-z0-9_.]+$/i, "только буквы, цифры, _ и ."),
  password: z.string().min(6).max(128),
  displayName: z.string().max(60).optional()
});

authRouter.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_input", details: parsed.error.flatten() });
    return;
  }
  const username = parsed.data.username.toLowerCase();
  if (await UserModel.findOne({ username })) {
    res.status(409).json({ error: "username_taken" });
    return;
  }
  const user = await UserModel.create({
    bmfId: newBmfId(),
    username,
    email: `${username}@${env.MAIL_DOMAIN}`,
    displayName: parsed.data.displayName ?? "",
    passwordHash: await hashPassword(parsed.data.password),
    avatarColor: colorFor(username)
  });
  res.json({ token: signToken({ sub: user._id.toString(), username }), user: publicUser(user) });
});

const loginSchema = z.object({ username: z.string(), password: z.string() });

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_input" });
    return;
  }
  const username = parsed.data.username.toLowerCase();
  const user = await UserModel.findOne({ username }).select("+passwordHash");
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    res.status(401).json({ error: "invalid_credentials" });
    return;
  }
  res.json({ token: signToken({ sub: user._id.toString(), username }), user: publicUser(user) });
});

authRouter.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  const user = await UserModel.findById(req.userId);
  if (!user) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json({ user: publicUser(user) });
});
