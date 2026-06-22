import { contextBridge, ipcRenderer } from "electron";

export type UpdateEvent =
  | { type: "available"; version: string }
  | { type: "none" }
  | { type: "progress"; percent: number }
  | { type: "downloaded"; version: string }
  | { type: "error"; message: string };

contextBridge.exposeInMainWorld("bmf", {
  isDesktop: true,
  win: {
    minimize: () => ipcRenderer.send("win:minimize"),
    toggleMaximize: () => ipcRenderer.send("win:toggle-maximize"),
    close: () => ipcRenderer.send("win:close")
  },
  updates: {
    check: () => ipcRenderer.invoke("updates:check"),
    install: () => ipcRenderer.send("updates:install"),
    onEvent: (cb: (e: UpdateEvent) => void) => {
      const listener = (_: unknown, data: UpdateEvent) => cb(data);
      ipcRenderer.on("updates:event", listener);
      return () => ipcRenderer.removeListener("updates:event", listener);
    }
  }
});
