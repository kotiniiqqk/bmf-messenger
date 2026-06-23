import { getSocket } from "../api/socket";

// Публичные STUN-серверы Google. Для надёжного NAT-обхода в проде добавить TURN.
const ICE: RTCConfiguration = {
  iceServers: [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }]
};

export interface PeerInfo {
  socketId: string;
  userId: string;
  username: string;
}

interface PeerConn {
  pc: RTCPeerConnection;
  polite: boolean;
  makingOffer: boolean;
  ignoreOffer: boolean;
  info: PeerInfo;
  stream: MediaStream;
}

export interface MediaFlags {
  mic: boolean;
  cam: boolean;
  screen: boolean;
}

export interface CallHandlers {
  /** stream=null — пир ушёл, убрать плитку. */
  onRemote: (socketId: string, info: PeerInfo, stream: MediaStream | null) => void;
  onLocal: (stream: MediaStream | null) => void;
  onFlags: (flags: MediaFlags) => void;
  onEnded: () => void;
}

/**
 * Mesh-звонок: по одному RTCPeerConnection на каждого участника, медиа идёт p2p,
 * сервер только ретранслирует SDP/ICE. Гонка offer'ов решается паттерном
 * «perfect negotiation» (вежливость пира детерминирована сравнением socketId).
 */
export class CallManager {
  chatId: string | null = null;
  private local: MediaStream | null = null;
  private camStream: MediaStream | null = null;
  private peers = new Map<string, PeerConn>();
  private flags: MediaFlags = { mic: true, cam: false, screen: false };
  private mySocketId = "";

  constructor(private h: CallHandlers) {}

  get active() {
    return this.chatId !== null;
  }

  private signal(to: string, data: unknown) {
    getSocket()?.emit("call:signal", { to, data });
  }

  private pushFlags() {
    if (this.chatId) {
      getSocket()?.emit("call:media", { chatId: this.chatId, state: { ...this.flags } });
    }
    this.h.onFlags({ ...this.flags });
  }

  async start(chatId: string, withVideo: boolean) {
    if (this.chatId) return;
    this.chatId = chatId;
    this.local = await navigator.mediaDevices.getUserMedia({ audio: true, video: withVideo });
    this.flags = { mic: true, cam: withVideo, screen: false };
    if (withVideo) this.camStream = this.local;
    this.h.onLocal(this.local);

    const s = getSocket();
    this.mySocketId = s?.id ?? "";
    s?.emit("call:join", { chatId }, (res: { ok: boolean; peers?: PeerInfo[] }) => {
      if (!res?.ok) {
        this.hangup();
        return;
      }
      this.mySocketId = s?.id ?? this.mySocketId;
      for (const p of res.peers ?? []) this.addPeer(p);
    });
    this.pushFlags();
  }

  // ── события сигналинга (вызываются из callStore) ──

  onPeerJoined(p: PeerInfo) {
    if (!this.chatId) return;
    this.mySocketId = getSocket()?.id ?? this.mySocketId;
    this.addPeer(p);
  }

  onPeerLeft(socketId: string) {
    this.removePeer(socketId);
  }

  async onSignal(
    from: string,
    info: PeerInfo,
    data: { description?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit }
  ) {
    if (!this.chatId) return;
    let conn = this.peers.get(from);
    if (!conn) {
      this.addPeer({ socketId: from, userId: info.userId, username: info.username });
      conn = this.peers.get(from);
    }
    if (!conn) return;
    const pc = conn.pc;

    try {
      if (data.description) {
        const desc = data.description;
        const collision = desc.type === "offer" && (conn.makingOffer || pc.signalingState !== "stable");
        conn.ignoreOffer = !conn.polite && collision;
        if (conn.ignoreOffer) return;
        await pc.setRemoteDescription(desc);
        if (desc.type === "offer") {
          await pc.setLocalDescription();
          this.signal(from, { description: pc.localDescription });
        }
      } else if (data.candidate) {
        try {
          await pc.addIceCandidate(data.candidate);
        } catch (e) {
          if (!conn.ignoreOffer) throw e;
        }
      }
    } catch {
      /* glare/transient — игнорируем */
    }
  }

  // ── управление медиа ──

  toggleMic() {
    if (!this.local) return;
    this.flags.mic = !this.flags.mic;
    this.local.getAudioTracks().forEach((t) => (t.enabled = this.flags.mic));
    this.pushFlags();
  }

  async toggleCam() {
    if (!this.local || this.flags.screen) return;
    if (this.flags.cam) {
      this.local.getVideoTracks().forEach((t) => {
        t.stop();
        this.local!.removeTrack(t);
      });
      this.replaceVideoTrack(null);
      this.camStream = null;
      this.flags.cam = false;
    } else {
      const vs = await navigator.mediaDevices.getUserMedia({ video: true });
      const track = vs.getVideoTracks()[0];
      this.local.addTrack(track);
      this.camStream = vs;
      this.replaceVideoTrack(track);
      this.flags.cam = true;
    }
    this.h.onLocal(this.local);
    this.pushFlags();
  }

  async toggleScreen() {
    if (!this.local) return;
    if (this.flags.screen) {
      // вернуться к камере (если была включена) либо выключить видео
      const camTrack = this.flags.cam
        ? (await navigator.mediaDevices.getUserMedia({ video: true })).getVideoTracks()[0]
        : null;
      this.swapLocalVideo(camTrack);
      this.flags.screen = false;
    } else {
      const ds = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const track = ds.getVideoTracks()[0];
      track.onended = () => {
        if (this.flags.screen) void this.toggleScreen();
      };
      this.swapLocalVideo(track);
      this.flags.screen = true;
    }
    this.h.onLocal(this.local);
    this.pushFlags();
  }

  private swapLocalVideo(track: MediaStreamTrack | null) {
    if (!this.local) return;
    this.local.getVideoTracks().forEach((t) => {
      t.stop();
      this.local!.removeTrack(t);
    });
    if (track) this.local.addTrack(track);
    this.replaceVideoTrack(track);
  }

  private replaceVideoTrack(track: MediaStreamTrack | null) {
    for (const { pc } of this.peers.values()) {
      const sender = pc.getSenders().find((s) => s.track?.kind === "video");
      if (sender) void sender.replaceTrack(track);
      else if (track && this.local) pc.addTrack(track, this.local);
    }
  }

  hangup() {
    if (this.chatId) getSocket()?.emit("call:leave", { chatId: this.chatId });
    for (const { pc } of this.peers.values()) pc.close();
    this.peers.clear();
    this.local?.getTracks().forEach((t) => t.stop());
    this.camStream?.getTracks().forEach((t) => t.stop());
    this.local = null;
    this.camStream = null;
    this.chatId = null;
    this.flags = { mic: true, cam: false, screen: false };
    this.h.onLocal(null);
    this.h.onEnded();
  }

  // ── внутреннее ──

  private addPeer(info: PeerInfo) {
    if (this.peers.has(info.socketId)) return;
    const pc = new RTCPeerConnection(ICE);
    const stream = new MediaStream();
    const conn: PeerConn = {
      pc,
      polite: this.mySocketId > info.socketId,
      makingOffer: false,
      ignoreOffer: false,
      info,
      stream
    };
    this.peers.set(info.socketId, conn);

    this.local?.getTracks().forEach((t) => pc.addTrack(t, this.local!));

    pc.ontrack = (e) => {
      stream.addTrack(e.track);
      this.h.onRemote(info.socketId, info, stream);
    };
    pc.onicecandidate = (e) => {
      if (e.candidate) this.signal(info.socketId, { candidate: e.candidate });
    };
    pc.onnegotiationneeded = async () => {
      try {
        conn.makingOffer = true;
        await pc.setLocalDescription();
        this.signal(info.socketId, { description: pc.localDescription });
      } catch {
        /* ignore */
      } finally {
        conn.makingOffer = false;
      }
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "closed") {
        this.removePeer(info.socketId);
      }
    };

    this.h.onRemote(info.socketId, info, stream);
  }

  private removePeer(socketId: string) {
    const conn = this.peers.get(socketId);
    if (!conn) return;
    conn.pc.close();
    this.peers.delete(socketId);
    this.h.onRemote(socketId, conn.info, null);
  }
}
