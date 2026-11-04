import { io, type Socket } from "socket.io-client";
import { BACKEND_URL } from "./api";

let socket: Socket | null = null;

export function connectSocket(token: string): Socket {
  socket?.disconnect();
  // Same JWT as REST; the server rejects the handshake otherwise.
  socket = io(BACKEND_URL || undefined, { auth: { token }, transports: ["websocket", "polling"], reconnectionDelayMax: 5000 });
  return socket;
}

export const getSocket = () => socket;

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
