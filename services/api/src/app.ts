import path from "node:path";
import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { authRouter } from "./routes/auth.js";
import { chatsRouter } from "./routes/chats.js";
import { mailRouter } from "./routes/mail.js";

const API_PREFIXES = ["/health", "/auth", "/chats", "/mail", "/socket.io"];

export function buildApp() {
  const app = express();
  // Token-авторизованный API: разрешаем любой origin (браузер на bmf.ink и Electron file://).
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: "2mb" }));

  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "bmf-api" });
  });

  app.use("/auth", authRouter);
  app.use("/chats", chatsRouter);
  app.use("/mail", mailRouter);

  // Раздача собранного веб-клиента (тот же контейнер отдаёт SPA), если задан WEB_DIR.
  const webDir = process.env.WEB_DIR;
  if (webDir) {
    app.use(express.static(webDir));
    app.get("*", (req, res, next) => {
      if (API_PREFIXES.some((p) => req.path.startsWith(p))) return next();
      res.sendFile(path.join(webDir, "index.html"));
    });
  }

  return app;
}
