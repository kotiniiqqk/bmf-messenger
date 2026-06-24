import { create } from "zustand";
import { api } from "../api/client";
import type { ApiMailHead, ApiMailFull } from "../api/types";

interface MailState {
  available: boolean;
  enabled: boolean;
  address: string;
  inbox: ApiMailHead[];
  open: ApiMailFull | null;
  loading: boolean;
  error: string | null;

  loadStatus: () => Promise<void>;
  connect: (password: string) => Promise<boolean>;
  loadInbox: () => Promise<void>;
  openMail: (id: string) => Promise<void>;
  closeMail: () => void;
  send: (b: { to: string; subject: string; text: string }) => Promise<boolean>;
}

export const useMailStore = create<MailState>((set, get) => ({
  available: true,
  enabled: false,
  address: "",
  inbox: [],
  open: null,
  loading: false,
  error: null,

  loadStatus: async () => {
    try {
      const s = await api.mailStatus();
      set({ available: s.available, enabled: s.enabled, address: s.address });
      if (s.enabled) await get().loadInbox();
    } catch {
      /* офлайн/нет доступа */
    }
  },

  connect: async (password) => {
    set({ loading: true, error: null });
    try {
      await api.mailConnect(password);
      set({ enabled: true, loading: false });
      await get().loadInbox();
      return true;
    } catch (e) {
      const code = (e as { code?: string })?.code ?? "error";
      set({ loading: false, error: code === "invalid_credentials" ? "Неверный пароль" : "Не удалось подключить почту" });
      return false;
    }
  },

  loadInbox: async () => {
    set({ loading: true });
    try {
      const { messages } = await api.mailList();
      set({ inbox: messages, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  openMail: async (id) => {
    set({ loading: true });
    try {
      const { message } = await api.mailGet(id);
      set({ open: message, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  closeMail: () => set({ open: null }),

  send: async (b) => {
    set({ loading: true, error: null });
    try {
      await api.mailSend(b);
      set({ loading: false });
      return true;
    } catch {
      set({ loading: false, error: "Не удалось отправить письмо" });
      return false;
    }
  }
}));
