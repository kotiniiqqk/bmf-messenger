import { verifyToken } from "../lib/jwt.js";
export function requireAuth(req, res, next) {
    const h = req.headers.authorization;
    if (!h?.startsWith("Bearer ")) {
        res.status(401).json({ error: "unauthorized" });
        return;
    }
    try {
        const p = verifyToken(h.slice(7));
        req.userId = p.sub;
        req.username = p.username;
        next();
    }
    catch {
        res.status(401).json({ error: "invalid_token" });
    }
}
