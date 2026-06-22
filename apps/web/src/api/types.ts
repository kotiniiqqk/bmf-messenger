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
  type: "dm" | "group";
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
