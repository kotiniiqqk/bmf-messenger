import { useState, type FormEvent } from "react";
import { useAuthStore } from "../store/authStore";
import { Icon } from "./Icon";

export function AuthPanel() {
  const { login, register, busy, error } = useAuthStore();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    if (mode === "login") void login(username, password);
    else void register(username, password, displayName || undefined);
  }

  return (
    <div className="auth">
      <form className="auth-card" onSubmit={submit}>
        <div className="auth-logo">
          <Icon name="logo" />
          <span>BMF</span>
        </div>
        <div className="auth-title">{mode === "login" ? "Вход" : "Регистрация"}</div>
        <div className="auth-sub">
          {mode === "login" ? "Войдите в свой BMF ID" : "Создайте единый аккаунт BMF ID"}
        </div>

        {mode === "register" && (
          <input
            className="auth-inp"
            placeholder="Отображаемое имя (необязательно)"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        )}
        <input
          className="auth-inp"
          placeholder="Имя пользователя"
          autoCapitalize="none"
          autoCorrect="off"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          className="auth-inp"
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {username.trim() && (
          <div className="auth-hint">
            Адрес: <b>{username.trim().toLowerCase()}@bmf.ink</b>
          </div>
        )}
        {error && <div className="auth-err">{error}</div>}

        <button className="auth-btn" type="submit" disabled={busy || !username || !password}>
          {busy ? "…" : mode === "login" ? "Войти" : "Создать аккаунт"}
        </button>

        <div className="auth-switch">
          {mode === "login" ? "Нет аккаунта? " : "Уже есть аккаунт? "}
          <span onClick={() => setMode(mode === "login" ? "register" : "login")}>
            {mode === "login" ? "Регистрация" : "Вход"}
          </span>
        </div>
      </form>
    </div>
  );
}
