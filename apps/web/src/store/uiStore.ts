import { create } from "zustand";
import type { Section, ThemeName } from "../types";

interface UIState {
  theme: ThemeName;
  section: Section;
  activeChatId: number;
  menuOpen: boolean;
  search: string;
  /** настраиваемые токены (Pro-цвета / прозрачность) */
  accent: string;
  opacity: number; // 25..100

  toast: string | null;

  setTheme: (t: ThemeName) => void;
  setSection: (s: Section) => void;
  setActiveChat: (id: number) => void;
  toggleMenu: (open?: boolean) => void;
  setSearch: (q: string) => void;
  setAccent: (c: string) => void;
  setOpacity: (v: number) => void;
  showToast: (msg: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  theme: "light",
  section: "messenger",
  activeChatId: 1,
  menuOpen: false,
  search: "",
  accent: "#6366f1",
  opacity: 95,
  toast: null,

  setTheme: (theme) => set({ theme }),
  setSection: (section) => set({ section, menuOpen: false }),
  setActiveChat: (activeChatId) => set({ activeChatId }),
  toggleMenu: (open) => set((s) => ({ menuOpen: open ?? !s.menuOpen })),
  setSearch: (search) => set({ search }),
  setAccent: (accent) => set({ accent }),
  setOpacity: (opacity) => set({ opacity }),
  showToast: (toast) => {
    set({ toast });
    window.setTimeout(() => set((s) => (s.toast === toast ? { toast: null } : {})), 2600);
  }
}));
