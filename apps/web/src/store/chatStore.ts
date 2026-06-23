import { create } from "zustand";
import { api } from "../api/client";
import { getSocket } from "../api/socket";
import { useCallStore } from "./callStore";
import type { ApiChat, ApiMessage } from "../api/types";

interface ChatState {
  chats: ApiChat[];
  activeChatId: string | null;
  messages: Record<string, ApiMessage[]>;
  onlineUsers: Set<string>;
  meId: string | null;
  attached: boolean;

  init: (meId: string) => Promise<void>;
  openChat: (id: string) => Promise<void>;
  send: (text: string) => void;
  startDm: (username: string) => Promise<ApiChat | null>;
  reset: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  chats: [],
  activeChatId: null,
  messages: {},
  onlineUsers: new Set<string>(),
  meId: null,
  attached: false,

  init: async (meId) => {
    set({ meId });
    const s = getSocket();
    if (s && !get().attached) {
      set({ attached: true });
      s.on("message:new", (m: ApiMessage) => {
        set((st) => {
          const list = st.messages[m.chatId] ?? [];
          const messages = list.some((x) => x.id === m.id)
            ? st.messages
            : { ...st.messages, [m.chatId]: [...list, m] };
          const chats = st.chats.map((c) =>
            c.id === m.chatId ? { ...c, lastMessage: { text: m.text, at: m.createdAt } } : c
          );
          chats.sort((a, b) => {
            const ta = a.lastMessage?.at ?? a.updatedAt;
            const tb = b.lastMessage?.at ?? b.updatedAt;
            return tb.localeCompare(ta);
          });
          return { messages, chats };
        });
      });
      s.on("presence:update", (p: { userId: string; online: boolean }) => {
        set((st) => {
          const next = new Set(st.onlineUsers);
          if (p.online) next.add(p.userId);
          else next.delete(p.userId);
          return { onlineUsers: next };
        });
      });
      s.on("disconnect", () => set({ attached: false }));
      useCallStore.getState().initSignaling();
    }
    try {
      const { chats } = await api.listChats();
      set({ chats });
    } catch {
      /* офлайн — оставляем как есть */
    }
  },

  openChat: async (id) => {
    set({ activeChatId: id });
    if (!get().messages[id]) {
      try {
        const { messages } = await api.messages(id);
        set((st) => ({ messages: { ...st.messages, [id]: messages } }));
      } catch {
        /* ignore */
      }
    }
  },

  send: (text) => {
    const { activeChatId } = get();
    const s = getSocket();
    const t = text.trim();
    if (!activeChatId || !s || !t) return;
    s.emit("message:send", { chatId: activeChatId, text: t });
  },

  startDm: async (username) => {
    try {
      const { chat } = await api.startDm(username);
      set((st) => ({
        chats: st.chats.some((c) => c.id === chat.id) ? st.chats : [chat, ...st.chats]
      }));
      await get().openChat(chat.id);
      return chat;
    } catch {
      return null;
    }
  },

  reset: () =>
    set({ chats: [], activeChatId: null, messages: {}, onlineUsers: new Set<string>(), meId: null, attached: false })
}));
