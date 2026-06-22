# BMF

Экосистема под единым **BMF ID**: почта (standalone) + мессенджер + встроенные звонки.
Моно-репозиторий (npm workspaces).

## Структура
- `apps/web` — веб-клиент (React + Vite + TS). Дизайн на CSS-токенах (light/dark + кастомизация).
- `apps/desktop` — десктоп-оболочка (Electron) с авто-обновлением через GitHub Releases.
- `services/*` — бэкенд-сервисы (BMF ID, мессенджер, почта) — добавляются по фазам.

## Запуск (dev)
```bash
npm install
npm run dev:web          # веб-клиент на http://localhost:5173
```

## Десктоп
```bash
# собрать веб + оболочку и запустить Electron локально
npm --workspace @bmf/desktop run start

# собрать установщик локально (без публикации)
npm --workspace @bmf/desktop run dist:local
```

## Релиз и обновления
Пуш тега `vX.Y.Z` → GitHub Actions собирает Windows-установщик и публикует в Releases.
В приложении: меню → «Проверить обновления» забирает новый релиз.

```bash
git tag v0.1.0 && git push origin v0.1.0
```

## Статус (по фазам)
- [x] M1 — каркас UI + дизайн-система + вид «Мессенджер»
- [x] Рельсы доставки — Electron + авто-обновление + CI
- [ ] M2 — вид «Почта» + настройки/темы
- [ ] M3 (Фаза 1) — BMF ID, мессенджер-API, чаты realtime
- [ ] M4 (Фаза 0) — синк почты (Stalwart) + звонок 1-на-1 (WebRTC + TURN)
- [ ] M5 (Фаза 2) — экран звонка + демонстрация экрана + группы (LiveKit)
