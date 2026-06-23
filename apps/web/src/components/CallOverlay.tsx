import { useEffect, useRef } from "react";
import { useCallStore } from "../store/callStore";
import { useChatStore } from "../store/chatStore";
import { Icon } from "./Icon";

function VideoTile({ stream, label, muted }: { stream: MediaStream; label: string; muted?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current && ref.current.srcObject !== stream) ref.current.srcObject = stream;
  }, [stream]);
  const hasVideo = stream.getVideoTracks().some((t) => t.enabled && t.readyState === "live");
  return (
    <div className="call-tile">
      <video ref={ref} autoPlay playsInline muted={muted} />
      {!hasVideo && <div className="call-tile-ph">{(label[0] ?? "?").toUpperCase()}</div>}
      <div className="call-tile-name">{label}</div>
    </div>
  );
}

export function CallOverlay() {
  const { status, chatId, localStream, remotes, flags, toggleMic, toggleCam, toggleScreen, hangup } = useCallStore();
  const chat = useChatStore((s) => s.chats.find((c) => c.id === chatId));

  if (status !== "active") return null;

  return (
    <div className="call-overlay">
      <div className="call-head">
        <div className="call-title">{chat?.name ?? "Звонок"}</div>
        <div className="call-sub">{remotes.length > 0 ? `Участников: ${remotes.length + 1}` : "Ожидание собеседника…"}</div>
      </div>

      <div className={`call-grid n${Math.min(remotes.length + 1, 4)}`}>
        {localStream && <VideoTile stream={localStream} label="Вы" muted />}
        {remotes.map((r) => (
          <VideoTile key={r.socketId} stream={r.stream} label={r.info.username} />
        ))}
      </div>

      <div className="call-ctrls">
        <button className={`call-btn${flags.mic ? "" : " off"}`} onClick={toggleMic} title="Микрофон">
          <Icon name={flags.mic ? "mic" : "micOff"} />
        </button>
        <button className={`call-btn${flags.cam ? " on" : ""}`} onClick={() => void toggleCam()} title="Камера">
          <Icon name={flags.cam ? "video" : "camOff"} />
        </button>
        <button className={`call-btn${flags.screen ? " on" : ""}`} onClick={() => void toggleScreen()} title="Демонстрация экрана">
          <Icon name="screen" />
        </button>
        <button className="call-btn hangup" onClick={hangup} title="Завершить">
          <Icon name="hangup" />
        </button>
      </div>
    </div>
  );
}
