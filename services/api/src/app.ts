import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { authRouter } from "./routes/auth.js";
import { chatsRouter } from "./routes/chats.js";

export function buildApp() {
  const app = express();
  app.use(cors({ origin: env.CLIENT_ORIGINS, credentials: true }));
  app.use(express.json({ limit: "2mb" }));

  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "bmf-api" });
  });

  app.use("/auth", authRouter);
  app.use("/chats", chatsRouter);

  return app;
}
