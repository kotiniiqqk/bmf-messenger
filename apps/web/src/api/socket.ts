import { io, type Socket } from "socket.io-client";
import { API_URL } from "../config";

let socket: Socket | null = null;

export function connectSocket(token: string): Socket {
  if (socket) socket.disconnect();
  socket = io(API_URL, { auth: { token }, transports: ["websocket"] });
  return socket;
}

export const getSocket = () => socket;

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
