import { useUIStore } from "../store/uiStore";
import { CHATS } from "../data/mock";
import { Icon } from "./Icon";

export function Sidebar() {
  const { section, setSection, activeChatId, setActiveChat, menuOpen, toggleMenu, search, setSearch, showToast } =
    useUIStore();

  const chats = CHATS.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

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
          <div
            className={`hbg-item${section === "messenger" ? " on" : ""}`}
            onClick={() => setSection("messenger")}
          >
            <Icon name="home" /> <span>Главная</span>
          </div>
          <div className="hbg-sep" />
          <div
            className={`hbg-item${section === "mail" ? " on" : ""}`}
            onClick={() => setSection("mail")}
          >
            <Icon name="mail" /> <span>Почта</span>
          </div>
          <div className="hbg-sep" />
          <div className="hbg-item" onClick={checkUpdates}>
            <Icon name="home" /> <span>Проверить обновления</span>
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

        <button className="gear" title="Настройки">
          <Icon name="gear" />
        </button>
      </div>

      <div className="sb-div" />

      <div className="chat-list">
        {chats.map((c) => (
          <div
            key={c.id}
            className={`ci${c.id === activeChatId ? " on" : ""}`}
            onClick={() => setActiveChat(c.id)}
          >
            <div className={`av${c.online ? " ol" : ""}`} style={{ background: c.color }}>
              {c.av}
            </div>
            <div className="ci-info">
              <div className="ci-name">{c.name}</div>
              <div className="ci-prev">{c.prev}</div>
            </div>
            <div className="ci-meta">
              <span className="ci-time">{c.time}</span>
              {c.unread > 0 && <span className="badge">{c.unread}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
