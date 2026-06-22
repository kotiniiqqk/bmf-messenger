import { Icon } from "./Icon";

export function TitleBar() {
  // В вебе кнопки декоративны; в Electron-оболочке (M-desktop) повесим на window-controls.
  return (
    <div className="tbar">
      <div className="app-logo" title="BMF">
        <Icon name="logo" />
        <span>BMF</span>
      </div>
      <div className="tbar-mid" />
      <div className="wc">
        <button className="circ grn" title="Свернуть" onClick={() => window.bmf?.win.minimize()} />
        <button className="circ yel" title="Развернуть" onClick={() => window.bmf?.win.toggleMaximize()} />
        <button className="circ red" title="Закрыть" onClick={() => window.bmf?.win.close()} />
      </div>
    </div>
  );
}
