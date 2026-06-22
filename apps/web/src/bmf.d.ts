export {};

export type UpdateEvent =
  | { type: "available"; version: string }
  | { type: "none" }
  | { type: "progress"; percent: number }
  | { type: "downloaded"; version: string }
  | { type: "error"; message: string };

declare global {
  interface Window {
    /** Доступно только в десктоп-сборке (Electron preload). В вебе — undefined. */
    bmf?: {
      isDesktop: boolean;
      win: { minimize(): void; toggleMaximize(): void; close(): void };
      updates: {
        check(): Promise<{ status: string; version?: string | null; message?: string }>;
        install(): void;
        onEvent(cb: (e: UpdateEvent) => void): () => void;
      };
    };
  }
}
