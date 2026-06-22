export interface Chat {
  id: number;
  name: string;
  av: string;
  color: string;
  online: boolean;
  prev: string;
  time: string;
  unread: number;
}

export interface Message {
  d: "in" | "out";
  av?: string;
  color?: string;
  text: string;
  t: string;
}

export interface Email {
  id: number;
  from: string;
  av: string;
  color: string;
  subj: string;
  prev: string;
  time: string;
  unread: boolean;
  star: boolean;
}

export type ThemeName = "light" | "dark";
export type Section = "messenger" | "mail";
