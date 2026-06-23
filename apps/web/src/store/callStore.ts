import { create } from "zustand";
import { getSocket } from "../api/socket";
import { CallManager, type MediaFlags, type PeerInfo } from "../rtc/CallManager";

export interface RemoteTile {
  socketId: string;
  info: PeerInfo;
  stream: MediaStream;
}

interface IncomingCall {
  chatId: string;
  from: { userId: string; username: string };
}

interface CallState {
  status: "idle" | "active";
  chatId: string | null;
  localStream: MediaStream | null;
  remotes: RemoteTile[];
  flags: MediaFlags;
  incoming: IncomingCall | null;
  attached: boolean;

  initSignaling: () => void;
  startCall: (chatId: string, withVideo: boolean) => Promise<void>;
  accept: () => Promise<void>;
  decline: () => void;
  hangup: () => void;
  toggleMic: () => void;
  toggleCam: () => Promise<void>;
  toggleScreen: () => Promise<void>;
}

export const useCallStore = create<CallState>((set, get) => {
  const manager = new CallManager({
    onLocal: (localStream) => set({ localStream }),
    onFlags: (flags) => set({ flags }),
    onRemote: (socketId, info, stream) =>
      set((st) => {
        if (!stream) return { remotes: st.remotes.filter((r) => r.socketId !== socketId) };
        const exists = st.remotes.some((r) => r.socketId === socketId);
        return {
          remotes: exists
            ? st.remotes.map((r) => (r.socketId === socketId ? { socketId, info, stream } : r))
            : [...st.remotes, { socketId, info, stream }]
        };
      }),
    onEnded: () => set({ status: "idle", chatId: null, remotes: [], localStream: null })
  });

  return {
    status: "idle",
    chatId: null,
    localStream: null,
    remotes: [],
    flags: { mic: true, cam: false, screen: false },
    incoming: null,
    attached: false,

    initSignaling: () => {
      const s = getSocket();
      if (!s || get().attached) return;
      set({ attached: true });

      s.on("call:incoming", (p: IncomingCall) => {
        if (manager.active) return; // уже в звонке — не дёргаем
        if (get().incoming) return;
        set({ incoming: p });
      });
      s.on("call:peer-joined", (p: PeerInfo) => manager.onPeerJoined(p));
      s.on("call:peer-left", (p: { socketId: string }) => manager.onPeerLeft(p.socketId));
      s.on(
        "call:signal",
        (p: { from: string; userId: string; username: string; data: { description?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit } }) =>
          void manager.onSignal(p.from, { socketId: p.from, userId: p.userId, username: p.username }, p.data)
      );
      s.on("disconnect", () => set({ attached: false }));
    },

    startCall: async (chatId, withVideo) => {
      if (get().status === "active") return;
      set({ status: "active", chatId, incoming: null, remotes: [] });
      try {
        await manager.start(chatId, withVideo);
      } catch {
        manager.hangup();
        set({ status: "idle", chatId: null });
      }
    },

    accept: async () => {
      const inc = get().incoming;
      if (!inc) return;
      await get().startCall(inc.chatId, false);
    },

    decline: () => set({ incoming: null }),

    hangup: () => manager.hangup(),
    toggleMic: () => manager.toggleMic(),
    toggleCam: () => manager.toggleCam(),
    toggleScreen: () => manager.toggleScreen()
  };
});
