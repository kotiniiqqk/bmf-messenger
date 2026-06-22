import { app, BrowserWindow, ipcMain } from "electron";
import { autoUpdater } from "electron-updater";
import path from "node:path";

const isDev = !!process.env.BMF_DEV;
let win: BrowserWindow | null = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 880,
    minHeight: 560,
    frame: false, // своя строка заголовка (дизайн BMF)
    backgroundColor: "#0f1230",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (isDev) {
    win.loadURL("http://localhost:5173");
  } else {
    win.loadFile(path.join(__dirname, "..", "renderer", "index.html"));
  }

  win.on("closed", () => (win = null));
}

app.whenReady().then(() => {
  createWindow();
  if (!isDev) autoUpdater.checkForUpdatesAndNotify().catch(() => undefined);
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// ── Управление окном (кнопки в нашей строке заголовка) ──
ipcMain.on("win:minimize", () => win?.minimize());
ipcMain.on("win:toggle-maximize", () => {
  if (!win) return;
  win.isMaximized() ? win.unmaximize() : win.maximize();
});
ipcMain.on("win:close", () => win?.close());

// ── Обновления (кнопка «Проверить обновления» внутри приложения) ──
ipcMain.handle("updates:check", async () => {
  if (isDev) return { status: "dev" as const };
  try {
    const r = await autoUpdater.checkForUpdates();
    return { status: "checked" as const, version: r?.updateInfo?.version ?? null };
  } catch (e) {
    return { status: "error" as const, message: String(e) };
  }
});
ipcMain.on("updates:install", () => autoUpdater.quitAndInstall());

function send(channel: string, payload?: unknown) {
  win?.webContents.send(channel, payload);
}
autoUpdater.on("update-available", (i) => send("updates:event", { type: "available", version: i.version }));
autoUpdater.on("update-not-available", () => send("updates:event", { type: "none" }));
autoUpdater.on("download-progress", (p) => send("updates:event", { type: "progress", percent: Math.round(p.percent) }));
autoUpdater.on("update-downloaded", (i) => send("updates:event", { type: "downloaded", version: i.version }));
autoUpdater.on("error", (e) => send("updates:event", { type: "error", message: String(e) }));
