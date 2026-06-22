// Адрес backend-API. В вебе — из VITE_API_URL, иначе локалка.
// В десктоп-сборке позже подставим прод-адрес VPS.
export const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:8080";
