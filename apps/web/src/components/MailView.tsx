import { useEffect, useState } from "react";
import { useMailStore } from "../store/mailStore";
import { Icon } from "./Icon";

const fmt = (at: string) => (at ? new Date(at).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "");

export function MailView() {
  const m = useMailStore();
  const [pw, setPw] = useState("");
  const [compose, setCompose] = useState(false);
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [text, setText] = useState("");

  useEffect(() => {
    void m.loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!m.available) {
    return <div className="cv"><div className="cv-empty">Почтовый сервис не настроен на сервере.</div></div>;
  }

  // ── Подключение ──
  if (!m.enabled) {
    return (
      <div className="cv">
        <div className="mail-connect">
          <div className="mail-connect-icon"><Icon name="mail" /></div>
          <div className="mail-connect-title">Подключить почту</div>
          <div className="mail-connect-sub">Ваш адрес <b>{m.address}</b>. Введите пароль аккаунта — он же станет паролем почтового ящика.</div>
          <input
            className="auth-inp"
            type="password"
            placeholder="Пароль аккаунта"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && pw && m.connect(pw)}
          />
          {m.error && <div className="auth-err">{m.error}</div>}
          <button className="auth-btn" disabled={!pw || m.loading} onClick={() => void m.connect(pw)}>
            {m.loading ? "Подключаем…" : "Подключить"}
          </button>
        </div>
      </div>
    );
  }

  async function doSend() {
    if (!to.trim()) return;
    const ok = await m.send({ to: to.trim(), subject, text });
    if (ok) {
      setCompose(false);
      setTo(""); setSubject(""); setText("");
    }
  }

  // ── Почтовый клиент ──
  return (
    <div className="cv mail">
      <div className="ch">
        <div className="av" style={{ background: "#6366f1" }}><Icon name="mail" /></div>
        <div className="ch-info">
          <div className="ch-name">Почта</div>
          <div className="ch-status">{m.address}</div>
        </div>
        <div className="ch-acts">
          <button className="ib" title="Обновить" onClick={() => void m.loadInbox()}><Icon name="search" /></button>
          <button className="ib" title="Написать" onClick={() => { setCompose(true); m.closeMail(); }}><Icon name="send" /></button>
        </div>
      </div>

      <div className="mail-body">
        <div className="mail-list">
          {m.inbox.length === 0 && <div className="cv-empty" style={{ padding: 24 }}>Входящих пока нет</div>}
          {m.inbox.map((e) => (
            <div
              key={e.id}
              className={`mail-row${m.open?.id === e.id ? " active" : ""}${e.seen ? "" : " unread"}`}
              onClick={() => { setCompose(false); void m.openMail(e.id); }}
            >
              <div className="mail-row-top">
                <span className="mail-from">{e.from || "—"}</span>
                <span className="mail-time">{fmt(e.receivedAt)}</span>
              </div>
              <div className="mail-subj">{e.subject}</div>
              <div className="mail-prev">{e.preview}</div>
            </div>
          ))}
        </div>

        <div className="mail-read">
          {compose ? (
            <div className="mail-compose">
              <div className="mail-compose-h">Новое письмо</div>
              <input className="auth-inp" placeholder="Кому (email)" value={to} onChange={(e) => setTo(e.target.value)} />
              <input className="auth-inp" placeholder="Тема" value={subject} onChange={(e) => setSubject(e.target.value)} />
              <textarea className="mail-text" placeholder="Текст письма…" value={text} onChange={(e) => setText(e.target.value)} />
              {m.error && <div className="auth-err">{m.error}</div>}
              <div className="mail-compose-acts">
                <button className="auth-btn" disabled={!to.trim() || m.loading} onClick={() => void doSend()}>
                  {m.loading ? "Отправка…" : "Отправить"}
                </button>
                <button className="ib" onClick={() => setCompose(false)}>Отмена</button>
              </div>
            </div>
          ) : m.open ? (
            <div className="mail-open">
              <div className="mail-open-subj">{m.open.subject}</div>
              <div className="mail-open-meta">От: {m.open.from}<br />Кому: {m.open.to}<br />{fmt(m.open.receivedAt)}</div>
              <div className="mail-open-body">{m.open.text}</div>
              <button className="auth-btn" style={{ width: "auto", marginTop: 12 }} onClick={() => {
                const addr = m.open!.from.match(/<([^>]+)>/)?.[1] ?? m.open!.from;
                setTo(addr); setSubject("Re: " + m.open!.subject); setText(""); setCompose(true);
              }}>Ответить</button>
            </div>
          ) : (
            <div className="cv-empty">Выберите письмо или нажмите «Написать»</div>
          )}
        </div>
      </div>
    </div>
  );
}
