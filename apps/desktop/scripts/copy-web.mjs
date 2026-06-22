import { cpSync, rmSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(here, "..", "..", "web", "dist");
const dest = path.resolve(here, "..", "renderer");

if (!existsSync(src)) {
  console.error("[copy-web] не найдена сборка веба:", src, "\nсначала: npm --workspace @bmf/web run build");
  process.exit(1);
}

rmSync(dest, { recursive: true, force: true });
cpSync(src, dest, { recursive: true });
console.log("[copy-web] renderer обновлён из", src);
