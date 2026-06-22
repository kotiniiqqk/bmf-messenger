import { create } from "zustand";
import { api, setAuthToken, ApiError } from "../api/client";
import type { ApiUser } from "../api/types";
import { connectSocket, disconnectSocket } from "../api/socket";
import { useChatStore } from "./chatStore";

const TKEY = "bmf.token";

const ERR: Record<string, string> = {
  username_taken: "Имя пользователя занято",
  invalid_credentials: "Неверный логин или пароль",
  invalid_input: "Проверьте корректность данных (3+ символа, пароль 6+)",
  user_not_found: "Пользователь не найден"
};
const errMessage = (code: string) => ERR[code] ?? "Ошибка. Попробуйте ещё раз";

interface AuthState {
  status: "loading" | "guest" | "authed";
  user: ApiUser | null;
  error: string | null;
  busy: boolean;

  bootstrap: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, displayName?: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => {
  const onAuthed = async (token: string, user: ApiUser) => {
    localStorage.setItem(TKEY, token);
    setAuthToken(token);
    connectSocket(token);
    set({ status: "authed", user, error: null, busy: false });
    await useChatStore.getState().init(user.id);
  };

  return {
    status: "loading",
    user: null,
    error: null,
    busy: false,

    bootstrap: async () => {
      const token = localStorage.getItem(TKEY);
      if (!token) {
        set({ status: "guest" });
        return;
      }
      setAuthToken(token);
      try {
        const { user } = await api.me();
        await onAuthed(token, user);
      } catch {
        localStorage.removeItem(TKEY);
        setAuthToken(null);
        set({ status: "guest", user: null });
      }
    },

    login: async (username, password) => {
      set({ busy: true, error: null });
      try {
        const { token, user } = await api.login({ username, password });
        await onAuthed(token, user);
      } catch (e) {
        set({ busy: false, error: errMessage(e instanceof ApiError ? e.code : "error") });
      }
    },

    register: async (username, password, displayName) => {
      set({ busy: true, error: null });
      try {
        const { token, user } = await api.register({ username, password, displayName });
        await onAuthed(token, user);
      } catch (e) {
        set({ busy: false, error: errMessage(e instanceof ApiError ? e.code : "error") });
      }
    },

    logout: () => {
      localStorage.removeItem(TKEY);
      setAuthToken(null);
      disconnectSocket();
      useChatStore.getState().reset();
      set({ status: "guest", user: null, error: null });
    }
  };
});
