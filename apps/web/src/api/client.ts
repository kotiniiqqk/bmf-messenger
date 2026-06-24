import { API_URL } from "../config";
import type { ApiChat, ApiMessage, ApiUser, ApiMailHead, ApiMailFull, ApiMailStatus } from "./types";

let authToken: string | null = null;
export const setAuthToken = (t: string | null) => {
  authToken = t;
};

export class ApiError extends Error {
  constructor(public status: number, public code: string) {
    super(code);
  }
}

async function req<T>(path: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(API_URL + path, {
    method,
    headers: {
      "content-type": "application/json",
      ...(authToken ? { authorization: `Bearer ${authToken}` } : {})
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, (data as { error?: string })?.error ?? "error");
  return data as T;
}

export const api = {
  register: (b: { username: string; password: string; displayName?: string }) =>
    req<{ token: string; user: ApiUser }>("/auth/register", "POST", b),
  login: (b: { username: string; password: string }) =>
    req<{ token: string; user: ApiUser }>("/auth/login", "POST", b),
  me: () => req<{ user: ApiUser }>("/auth/me", "GET"),
  listChats: () => req<{ chats: ApiChat[] }>("/chats", "GET"),
  startDm: (username: string) => req<{ chat: ApiChat }>("/chats/dm", "POST", { username }),
  messages: (chatId: string) => req<{ messages: ApiMessage[] }>(`/chats/${chatId}/messages`, "GET"),

  // ── Почта ──
  mailStatus: () => req<ApiMailStatus>("/mail/status", "GET"),
  mailConnect: (password: string) => req<{ ok: boolean; address: string }>("/mail/connect", "POST", { password }),
  mailList: () => req<{ messages: ApiMailHead[] }>("/mail", "GET"),
  mailGet: (id: string) => req<{ message: ApiMailFull }>(`/mail/${id}`, "GET"),
  mailSend: (b: { to: string; subject: string; text: string }) => req<{ ok: boolean }>("/mail/send", "POST", b)
};
