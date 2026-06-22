import { useEffect, useRef, useState } from "react";
import { useUIStore } from "../store/uiStore";
import { CHATS, MSGS } from "../data/mock";
import type { Message } from "../types";
import { Icon } from "./Icon";

function nowTime() {
  return new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

export function ChatView() {
  const activeChatId = useUIStore((s) => s.activeChatId);
  const chat = CHATS.find((c) => c.id === activeChatId);

  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const msgsRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setMessages(MSGS[activeChatId] ?? []);
  }, [activeChatId]);

  useEffect(() => {
    msgsRef.current?.scrollTo({ top: msgsRef.current.scrollHeight });
  }, [messages]);

  function send() {
    const text = draft.trim();
    if (!text) return;
    setMessages((m) => [...m, { d: "out", text, t: nowTime() }]);
    setDraft("");
    if (taRef.current) taRef.current.style.height = "34px";
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function autoH(el: HTMLTextAreaElement) {
    el.style.height = "34px";
    el.style.height = Math.min(el.scrollHeight, 110) + "px";
  }

  if (!chat) return <div className="cv"><div className="cv-empty">Выберите чат</div></div>;

  return (
    <div className="cv">
      <div className="ch">
        <div className="av ol" style={{ background: chat.color }}>{chat.av}</div>
        <div className="ch-info">
          <div className="ch-name">{chat.name}</div>
          <div className="ch-status" style={{ color: chat.online ? "#22c55e" : "var(--txt2)" }}>
            {chat.online ? "в сети" : "был(а) недавно"}
          </div>
        </div>
        <div className="ch-acts">
          <button className="ib" title="Поиск в чате"><Icon name="search" /></button>
          <button className="ib" title="Видеозвонок"><Icon name="video" /></button>
          <button className="ib" title="Звонок"><Icon name="phone" /></button>
          <button className="ib" title="Ещё"><Icon name="more" /></button>
        </div>
      </div>

      <div className="msgs" ref={msgsRef}>
        {messages.map((m, i) => (
          <div key={i} className={`mr ${m.d}`}>
            {m.d === "in" && (
              <div className="mav" style={{ background: m.color ?? chat.color }}>{m.av ?? chat.av}</div>
            )}
            <div className="bbl">
              {m.text}
              <div className="bt">{m.t}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="inp-row">
        <button className="ia" title="Прикрепить"><Icon name="attach" /></button>
        <textarea
          ref={taRef}
          className="mi"
          placeholder="Написать сообщение..."
          rows={1}
          value={draft}
          onChange={(e) => { setDraft(e.target.value); autoH(e.target); }}
          onKeyDown={onKey}
        />
        <button className="ia" title="Эмодзи"><Icon name="emoji" /></button>
        <button className="sb-btn" onClick={send}><Icon name="send" /></button>
      </div>
    </div>
  );
}
