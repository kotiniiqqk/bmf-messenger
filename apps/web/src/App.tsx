import { useEffect } from "react";
import { useUIStore } from "./store/uiStore";
import { useAuthStore } from "./store/authStore";
import { TitleBar } from "./components/TitleBar";
import { Sidebar } from "./components/Sidebar";
import { ChatView } from "./components/ChatView";
import { MailView } from "./components/MailView";
import { AuthPanel } from "./components/AuthPanel";
import { CallOverlay } from "./components/CallOverlay";
import { IncomingCall } from "./components/IncomingCall";

export default function App() {
  const { theme, section, accent, opacity, toast } = useUIStore();
  const { status, bootstrap } = useAuthStore();

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.style.setProperty("--acc", accent);
    const op = String(opacity / 100);
    root.style.setProperty("--op", op);
    root.style.setProperty("--op-min", op);
    root.style.setProperty("--op-panel", op);
  }, [theme, accent, opacity]);

  return (
    <div className="app">
      <TitleBar />
      {status === "loading" && <div className="splash">Загрузка…</div>}
      {status === "guest" && <AuthPanel />}
      {status === "authed" && (
        <div className="body">
          <Sidebar />
          {section === "messenger" ? <ChatView /> : <MailView />}
        </div>
      )}
      {status === "authed" && <IncomingCall />}
      {status === "authed" && <CallOverlay />}
      <div className={`toast${toast ? " show" : ""}`}>{toast}</div>
    </div>
  );
}
