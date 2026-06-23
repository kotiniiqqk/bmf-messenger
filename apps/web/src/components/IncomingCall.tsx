import { useCallStore } from "../store/callStore";
import { Icon } from "./Icon";

export function IncomingCall() {
  const { incoming, status, accept, decline } = useCallStore();
  if (!incoming || status === "active") return null;

  return (
    <div className="ring-toast">
      <div className="ring-ava">{(incoming.from.username[0] ?? "?").toUpperCase()}</div>
      <div className="ring-info">
        <div className="ring-name">{incoming.from.username}</div>
        <div className="ring-sub">Входящий звонок…</div>
      </div>
      <div className="ring-acts">
        <button className="ring-btn accept" onClick={() => void accept()} title="Принять">
          <Icon name="phone" />
        </button>
        <button className="ring-btn decline" onClick={decline} title="Отклонить">
          <Icon name="hangup" />
        </button>
      </div>
    </div>
  );
}
