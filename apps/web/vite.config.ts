import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Относительные пути к ассетам — чтобы сборка грузилась из file:// внутри Electron.
  base: "./",
  server: {
    port: 5173,
    host: true
  }
});
