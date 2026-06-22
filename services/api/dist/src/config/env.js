import "dotenv/config";
export const env = {
    PORT: Number(process.env.PORT ?? 8080),
    MONGODB_URI: process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/bmf",
    JWT_SECRET: process.env.JWT_SECRET ?? "dev-secret-change-me",
    MAIL_DOMAIN: process.env.MAIL_DOMAIN ?? "bmf.ink",
    CLIENT_ORIGINS: (process.env.CLIENT_ORIGINS ?? "http://localhost:5173")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
};
