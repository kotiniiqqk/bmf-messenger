export interface ApiUser {
  id: string;
  bmfId: string;
  username: string;
  email: string;
  displayName: string;
  avatarColor: string;
}

export interface ApiChat {
  id: string;
  type: "dm" | "group" | "saved";
  name: string;
  avatarColor: string;
  members: ApiUser[];
  lastMessage: { text: string; at: string } | null;
  updatedAt: string;
}

export interface ApiMessage {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  createdAt: string;
}

export interface ApiMailStatus {
  enabled: boolean;
  address: string;
  available: boolean;
}

export interface ApiMailHead {
  id: string;
  subject: string;
  from: string;
  preview: string;
  receivedAt: string;
  seen: boolean;
}

export interface ApiMailFull {
  id: string;
  subject: string;
  from: string;
  to: string;
  receivedAt: string;
  text: string;
}
