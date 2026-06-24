import { env } from "../config/env.js";

// Клиент Stalwart: создание почтовых ящиков (management API) и работа с почтой
// через JMAP (чтение входящих, просмотр письма, отправка). Сервер ходит в Stalwart
// по внутренней docker-сети (STALWART_BASE_URL = http://stalwart:8080).

const BASE = () => env.STALWART_BASE_URL.replace(/\/$/, "");
const adminAuth = () =>
  "Basic " + Buffer.from(`${env.STALWART_API_USER}:${env.STALWART_API_SECRET}`).toString("base64");
const userAuth = (login: string, password: string) =>
  "Basic " + Buffer.from(`${login}:${password}`).toString("base64");

// Креды доступа к ящику: login (имя принципала = username, по нему Stalwart
// аутентифицирует), email (адрес, для поля From) и пароль.
export interface MailCreds {
  login: string;
  email: string;
  password: string;
}

export interface MailHeadItem {
  id: string;
  subject: string;
  from: string;
  preview: string;
  receivedAt: string;
  seen: boolean;
}

/** Создать индивидуальный почтовый ящик в Stalwart (идемпотентно). */
export async function createMailbox(username: string, email: string, password: string, displayName: string) {
  const res = await fetch(`${BASE()}/api/principal`, {
    method: "POST",
    headers: { Authorization: adminAuth(), "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "individual",
      name: username,
      secrets: [password],
      emails: [email],
      description: displayName || username
    })
  });
  const body = await res.text();
  if (res.ok) return { created: true };
  // Уже существует — считаем успехом (идемпотентность).
  if (res.status === 409 || /already exist|duplicate|conflict/i.test(body)) return { created: false };
  throw new Error(`stalwart create ${res.status}: ${body.slice(0, 200)}`);
}

// ── JMAP ──

interface JmapSession {
  accountId: string;
  login: string;
  email: string;
  password: string;
}

async function jmapCall(s: JmapSession, methodCalls: unknown[], using: string[]) {
  const res = await fetch(`${BASE()}/jmap`, {
    method: "POST",
    headers: { Authorization: userAuth(s.login, s.password), "Content-Type": "application/json" },
    body: JSON.stringify({ using, methodCalls })
  });
  if (!res.ok) throw new Error(`jmap ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()) as { methodResponses: [string, any, string][] };
}

/** Открыть JMAP-сессию: получить accountId почты. Логин — имя принципала. */
export async function jmapSession(creds: MailCreds): Promise<JmapSession> {
  const res = await fetch(`${BASE()}/.well-known/jmap`, {
    headers: { Authorization: userAuth(creds.login, creds.password) }
  });
  if (!res.ok) throw new Error(`jmap session ${res.status}`);
  const data = (await res.json()) as { primaryAccounts: Record<string, string> };
  const accountId = data.primaryAccounts?.["urn:ietf:params:jmap:mail"];
  if (!accountId) throw new Error("jmap: no mail account");
  return { accountId, login: creds.login, email: creds.email, password: creds.password };
}

const MAIL_CAP = ["urn:ietf:params:jmap:core", "urn:ietf:params:jmap:mail"];

/** id системных папок по ролям (inbox/drafts/sent). */
async function mailboxRoles(s: JmapSession): Promise<Record<string, string>> {
  const r = await jmapCall(s, [["Mailbox/get", { accountId: s.accountId, ids: null, properties: ["id", "role"] }, "m"]], MAIL_CAP);
  const list = (r.methodResponses[0]?.[1]?.list ?? []) as { id: string; role: string | null }[];
  const roles: Record<string, string> = {};
  for (const mb of list) if (mb.role) roles[mb.role] = mb.id;
  return roles;
}

/** Список входящих (заголовки). */
export async function listInbox(creds: MailCreds, limit = 30): Promise<MailHeadItem[]> {
  const s = await jmapSession(creds);
  const roles = await mailboxRoles(s);
  const inbox = roles["inbox"];
  if (!inbox) return [];
  const r = await jmapCall(
    s,
    [
      ["Email/query", { accountId: s.accountId, filter: { inMailbox: inbox }, sort: [{ property: "receivedAt", isAscending: false }], position: 0, limit }, "q"],
      ["Email/get", { accountId: s.accountId, "#ids": { resultOf: "q", name: "Email/query", path: "/ids" }, properties: ["id", "subject", "from", "preview", "receivedAt", "keywords"] }, "g"]
    ],
    MAIL_CAP
  );
  const emails = (r.methodResponses.find((m) => m[0] === "Email/get")?.[1]?.list ?? []) as any[];
  return emails.map((e) => ({
    id: e.id,
    subject: e.subject ?? "(без темы)",
    from: e.from?.[0] ? `${e.from[0].name ? e.from[0].name + " " : ""}<${e.from[0].email}>` : "",
    preview: e.preview ?? "",
    receivedAt: e.receivedAt ?? "",
    seen: Boolean(e.keywords?.["$seen"])
  }));
}

/** Полное письмо (текст). */
export async function getEmail(creds: MailCreds, id: string) {
  const s = await jmapSession(creds);
  const r = await jmapCall(
    s,
    [
      ["Email/get", { accountId: s.accountId, ids: [id], properties: ["id", "subject", "from", "to", "receivedAt", "textBody", "htmlBody", "bodyValues"], fetchTextBodyValues: true, fetchHTMLBodyValues: true, maxBodyValueBytes: 250000 }, "g"]
    ],
    MAIL_CAP
  );
  const e = (r.methodResponses[0]?.[1]?.list ?? [])[0] as any;
  if (!e) throw new Error("email not found");
  const textPart = e.textBody?.[0]?.partId;
  const htmlPart = e.htmlBody?.[0]?.partId;
  const text = textPart ? e.bodyValues?.[textPart]?.value ?? "" : "";
  const html = htmlPart ? e.bodyValues?.[htmlPart]?.value ?? "" : "";
  return {
    id: e.id,
    subject: e.subject ?? "(без темы)",
    from: e.from?.[0] ? `${e.from[0].name ? e.from[0].name + " " : ""}<${e.from[0].email}>` : "",
    to: (e.to ?? []).map((t: any) => t.email).join(", "),
    receivedAt: e.receivedAt ?? "",
    text: text || html.replace(/<[^>]+>/g, " ").trim()
  };
}

/** Отправить письмо. */
export async function sendEmail(creds: MailCreds, msg: { to: string; subject: string; text: string }) {
  const s = await jmapSession(creds);
  const email = s.email;
  const roles = await mailboxRoles(s);
  const drafts = roles["drafts"];
  const sent = roles["sent"];

  // identityId
  const ir = await jmapCall(s, [["Identity/get", { accountId: s.accountId, ids: null }, "i"]], [...MAIL_CAP, "urn:ietf:params:jmap:submission"]);
  const identities = (ir.methodResponses[0]?.[1]?.list ?? []) as { id: string; email: string }[];
  const identityId = (identities.find((i) => i.email === email) ?? identities[0])?.id;
  if (!identityId) throw new Error("jmap: no identity");

  const draftId = "draft1";
  const r = await jmapCall(
    s,
    [
      [
        "Email/set",
        {
          accountId: s.accountId,
          create: {
            [draftId]: {
              mailboxIds: drafts ? { [drafts]: true } : {},
              keywords: { $draft: true, $seen: true },
              from: [{ email }],
              to: [{ email: msg.to }],
              subject: msg.subject,
              bodyValues: { body: { value: msg.text } },
              textBody: [{ partId: "body", type: "text/plain" }]
            }
          }
        },
        "set"
      ],
      [
        "EmailSubmission/set",
        {
          accountId: s.accountId,
          onSuccessUpdateEmail: {
            "#sub": {
              "keywords/$draft": null,
              ...(sent ? { mailboxIds: { [sent]: true } } : {})
            }
          },
          create: {
            sub: {
              identityId,
              emailId: `#${draftId}`,
              envelope: { mailFrom: { email }, rcptTo: [{ email: msg.to }] }
            }
          }
        },
        "submit"
      ]
    ],
    [...MAIL_CAP, "urn:ietf:params:jmap:submission"]
  );
  const submitRes = r.methodResponses.find((m) => m[0] === "EmailSubmission/set")?.[1];
  if (submitRes?.notCreated?.sub) {
    throw new Error("jmap submit failed: " + JSON.stringify(submitRes.notCreated.sub).slice(0, 200));
  }
  return { ok: true };
}
