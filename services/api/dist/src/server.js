import { createServer } from "node:http";
import { buildApp } from "./app.js";
import { attachRealtime } from "./socket/index.js";
import { connectDB } from "./db.js";
import { env } from "./config/env.js";
async function main() {
    await connectDB(env.MONGODB_URI);
    const http = createServer(buildApp());
    attachRealtime(http);
    http.listen(env.PORT, () => console.log(`[bmf-api] listening on :${env.PORT}`));
}
main().catch((e) => {
    console.error("[bmf-api] fatal:", e);
    process.exit(1);
});
