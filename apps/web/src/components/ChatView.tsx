import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useChatStore } from "../store/chatStore";
import { useCallStore } from "../store/callStore";
import { Icon } from "./Icon";

const fmt = (at: string) => new Date(at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

export function ChatView() {
  const { chats, activeChatId, messages, meId, send, onlineUsers } = useChatStore();
  const startCall = useCallStore((s) => s.startCall);
  const inCall = useCallStore((s) => s.status === "active");
  const chat = chats.find((c) => c.id === activeChatId);
  const msgs = activeChatId ? messages[activeChatId] ?? [] : [];

  const [draft, setDraft] = useState("");
  const msgsRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    msgsRef.current?.scrollTo({ top: msgsRef.current.scrollHeight });
  }, [msgs.length, activeChatId]);

  function doSend() {
    const t = draft.trim();
    if (!t) return;
    send(t);
    setDraft("");
    if (taRef.current) taRef.current.style.height = "34px";
  }
  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      doSend();
    }
  }
  function autoH(el: HTMLTextAreaElement) {
    el.style.height = "34px";
    el.style.height = Math.min(el.scrollHeight, 110) + "px";
  }

  if (!chat) {
    return (
      <div className="cv">
        <div className="cv-empty">Выберите чат или начните новый кнопкой «+»</div>
      </div>
    );
  }

  const other = chat.members.find((m) => m.id !== meId);
  const online = other ? onlineUsers.has(other.id) : false;
  const letter = (chat.name[0] ?? "?").toUpperCase();

  return (
    <div className="cv">
      <div className="ch">
        <div className={`av${online ? " ol" : ""}`} style={{ background: chat.avatarColor }}>{letter}</div>
        <div className="ch-info">
          <div className="ch-name">{chat.name}</div>
          <div className="ch-status" style={{ color: online ? "#22c55e" : "var(--txt2)" }}>
            {online ? "в сети" : "не в сети"}
          </div>
        </div>
        <div className="ch-acts">
          <button className="ib" title="Видеозвонок" disabled={inCall} onClick={() => activeChatId && void startCall(activeChatId, true)}>
            <Icon name="video" />
          </button>
          <button className="ib" title="Звонок" disabled={inCall} onClick={() => activeChatId && void startCall(activeChatId, false)}>
            <Icon name="phone" />
          </button>
          <button className="ib" title="Ещё"><Icon name="more" /></button>
        </div>
      </div>

      <div className="msgs" ref={msgsRef}>
        {msgs.map((m) => {
          const out = m.senderId === meId;
          return (
            <div key={m.id} className={`mr ${out ? "out" : "in"}`}>
              {!out && <div className="mav" style={{ background: chat.avatarColor }}>{letter}</div>}
              <div className="bbl">
                {m.text}
                <div className="bt">{fmt(m.createdAt)}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="inp-row">
        <button className="ia" title="Прикрепить"><Icon name="attach" /></button>
        <textarea
          ref={taRef}
          className="mi"
          placeholder="Написать сообщение..."
          rows={1}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            autoH(e.target);
          }}
          onKeyDown={onKey}
        />
        <button className="ia" title="Эмодзи"><Icon name="emoji" /></button>
        <button className="sb-btn" onClick={doSend}><Icon name="send" /></button>
      </div>
    </div>
  );
}
