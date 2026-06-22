import { useUIStore } from "../store/uiStore";
import { useChatStore } from "../store/chatStore";
import { useAuthStore } from "../store/authStore";
import type { ApiChat } from "../api/types";
import { Icon } from "./Icon";

function fmtTime(at?: string) {
  if (!at) return "";
  const d = new Date(at);
  const today = new Date();
  if (d.toDateString() === today.toDateString())
    return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
}

export function Sidebar() {
  const { section, setSection, menuOpen, toggleMenu, search, setSearch, showToast } = useUIStore();
  const { chats, activeChatId, openChat, startDm, onlineUsers, meId } = useChatStore();
  const logout = useAuthStore((s) => s.logout);
  const me = useAuthStore((s) => s.user);

  const filtered = chats.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  const otherOnline = (c: ApiChat) => {
    if (c.type !== "dm") return false;
    const other = c.members.find((m) => m.id !== meId);
    return other ? onlineUsers.has(other.id) : false;
  };

  async function newChat() {
    const username = window.prompt("Имя пользователя для нового чата:");
    if (!username) return;
    const chat = await startDm(username.trim().toLowerCase());
    if (!chat) showToast("Пользователь не найден");
  }

  async function checkUpdates() {
    toggleMenu(false);
    if (!window.bmf?.isDesktop) {
      showToast("Обновления доступны в десктоп-версии");
      return;
    }
    showToast("Проверяю обновления…");
    const r = await window.bmf.updates.check();
    if (r.status === "checked") showToast(r.version ? `Найдена версия ${r.version} — загрузка…` : "Установлена последняя версия");
    else if (r.status === "dev") showToast("Dev-режим: обновления отключены");
    else showToast("Не удалось проверить обновления");
  }

  return (
    <div className="sdb">
      <div className="srch-row">
        <button className="hbg" title="Меню" onClick={() => toggleMenu()}>
          <span /><span /><span />
        </button>
        <div className={`hbg-menu${menuOpen ? " open" : ""}`}>
          <div className={`hbg-item${section === "messenger" ? " on" : ""}`} onClick={() => setSection("messenger")}>
            <Icon name="home" /> <span>Главная</span>
          </div>
          <div className="hbg-sep" />
          <div className={`hbg-item${section === "mail" ? " on" : ""}`} onClick={() => setSection("mail")}>
            <Icon name="mail" /> <span>Почта</span>
          </div>
          <div className="hbg-sep" />
          <div className="hbg-item" onClick={checkUpdates}>
            <Icon name="home" /> <span>Проверить обновления</span>
          </div>
          <div className="hbg-sep" />
          <div className="hbg-item" onClick={() => { toggleMenu(false); logout(); }}>
            <Icon name="logout" /> <span>Выйти{me ? ` (@${me.username})` : ""}</span>
          </div>
        </div>

        <div className="srch-wrap">
          <Icon name="search" />
          <input
            className="srch"
            type="text"
            placeholder="Поиск..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <button className="gear" title="Новый чат" onClick={newChat}>
          <Icon name="plus" />
        </button>
      </div>

      <div className="sb-div" />

      <div className="chat-list">
        {filtered.length === 0 && (
          <div className="chat-empty">Пока нет чатов.<br />Нажми «+», чтобы начать.</div>
        )}
        {filtered.map((c) => (
          <div
            key={c.id}
            className={`ci${c.id === activeChatId ? " on" : ""}`}
            onClick={() => openChat(c.id)}
          >
            <div className={`av${otherOnline(c) ? " ol" : ""}`} style={{ background: c.avatarColor }}>
              {(c.name[0] ?? "?").toUpperCase()}
            </div>
            <div className="ci-info">
              <div className="ci-name">{c.name}</div>
              <div className="ci-prev">{c.lastMessage?.text || "Нет сообщений"}</div>
            </div>
            <div className="ci-meta">
              <span className="ci-time">{fmtTime(c.lastMessage?.at)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
