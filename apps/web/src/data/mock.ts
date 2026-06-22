import type { Chat, Email, Message } from "../types";

/* Временные данные для M1 (UI). В M3 заменяются реальными из API/Socket.io. */

export const CHATS: Chat[] = [
  { id: 1, name: "Алексей", av: "А", color: "#6366f1", online: true, prev: "Буду рад твоему мнению!", time: "14:30", unread: 2 },
  { id: 2, name: "Мария", av: "М", color: "#ec4899", online: true, prev: "Встреча в 18:00, не забудь", time: "13:45", unread: 0 },
  { id: 3, name: "Группа Работа", av: "Р", color: "#f59e0b", online: false, prev: "Денис: Обновили дизайн!", time: "12:00", unread: 5 },
  { id: 4, name: "Дмитрий", av: "Д", color: "#10b981", online: false, prev: "Спасибо за помощь!", time: "11:30", unread: 0 },
  { id: 5, name: "Анна", av: "А", color: "#f43f5e", online: true, prev: "Фото уже отправила", time: "вчера", unread: 0 },
  { id: 6, name: "Команда", av: "К", color: "#8b5cf6", online: false, prev: "Новый проект запущен!", time: "вчера", unread: 0 },
  { id: 7, name: "Сергей", av: "С", color: "#06b6d4", online: false, prev: "Когда будешь свободен?", time: "пн", unread: 0 },
  { id: 8, name: "Поддержка", av: "П", color: "#64748b", online: true, prev: "Ваш вопрос решён", time: "пн", unread: 0 }
];

export const MSGS: Record<number, Message[]> = {
  1: [
    { d: "in", av: "А", color: "#6366f1", text: "Привет! Как дела?", t: "14:20" },
    { d: "out", text: "Привет! Всё отлично, спасибо", t: "14:22" },
    { d: "in", av: "А", color: "#6366f1", text: "Ты посмотрел новый дизайн мессенджера?", t: "14:25" },
    { d: "out", text: "Да, выглядит очень круто! Особенно прозрачный фон и кнопки управления", t: "14:26" },
    { d: "in", av: "А", color: "#6366f1", text: "Буду рад твоему мнению!", t: "14:30" }
  ],
  2: [
    { d: "in", av: "М", color: "#ec4899", text: "Не забудь про встречу в 18:00", t: "13:40" },
    { d: "out", text: "Помню, буду вовремя", t: "13:42" },
    { d: "in", av: "М", color: "#ec4899", text: "Встреча в 18:00, не забудь", t: "13:45" }
  ],
  3: [
    { d: "in", av: "Д", color: "#f59e0b", text: "Всем привет! Обновили дизайн", t: "12:00" },
    { d: "out", text: "Огонь! Отличная работа команда", t: "12:05" }
  ]
};

export const EMAILS: Email[] = [
  { id: 1, from: "Google", av: "G", color: "#4285f4", subj: "Ваш аккаунт был использован на новом устройстве", prev: "Если это были не вы — немедленно...", time: "14:22", unread: true, star: false },
  { id: 2, from: "GitHub", av: "GH", color: "#24292e", subj: "[PR #142] Review requested: feature/messenger-ui", prev: "Алексей Иванов запросил ваш отзыв...", time: "13:10", unread: true, star: true },
  { id: 3, from: "Мария Петрова", av: "М", color: "#ec4899", subj: "Дизайн-макеты приложения", prev: "Привет! Отправляю финальные варианты...", time: "12:05", unread: false, star: true },
  { id: 4, from: "Команда", av: "К", color: "#8b5cf6", subj: "Новый проект запущен в продакшн 🚀", prev: "Отличная работа! Мы официально запустили...", time: "11:30", unread: true, star: false }
];
