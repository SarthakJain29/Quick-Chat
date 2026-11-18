import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { verifyToken } from "./auth.js";

/** Events pushed to clients. Kept in one place so client + server stay in sync. */
export type ServerEvent =
  | "presence"
  | "message:new"
  | "message:seen"
  | "message:reaction"
  | "typing";

export interface Realtime {
  emitToUser(userId: string, event: ServerEvent, payload: unknown): void;
  isOnline(userId: string): boolean;
  onlineIds(): string[];
}

export class NoopRealtime implements Realtime {
  events: { userId: string; event: ServerEvent; payload: unknown }[] = [];
  emitToUser(userId: string, event: ServerEvent, payload: unknown) {
    this.events.push({ userId, event, payload });
  }
  isOnline() {
    return false;
  }
  onlineIds() {
    return [];
  }
}

export function createRealtime(httpServer: HttpServer, origins: string[], opts: { alwaysOnline: () => string[] }): Realtime {
  const io = new Server(httpServer, { cors: { origin: origins, credentials: true } });
  const sockets = new Map<string, number>(); // userId -> open connection count (multi-tab safe)

  const ids = () => [...new Set([...sockets.keys(), ...opts.alwaysOnline()])];
  const broadcastPresence = () => io.emit("presence", ids());

  // Authenticate the socket with the same JWT as the REST API (no more trusting ?userId=).
  io.use((socket, next) => {
    const userId = verifyToken(String(socket.handshake.auth?.token ?? ""));
    if (!userId) return next(new Error("unauthorized"));
    socket.data.userId = userId;
    next();
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId as string;
    socket.join(`user:${userId}`);
    sockets.set(userId, (sockets.get(userId) ?? 0) + 1);
    broadcastPresence();

    socket.on("typing", (p: { to?: string; isTyping?: boolean }) => {
      if (typeof p?.to !== "string") return;
      io.to(`user:${p.to}`).emit("typing", { from: userId, isTyping: !!p.isTyping });
    });

    socket.on("disconnect", () => {
      const n = (sockets.get(userId) ?? 1) - 1;
      if (n <= 0) sockets.delete(userId);
      else sockets.set(userId, n);
      broadcastPresence();
    });
  });

  return {
    emitToUser: (userId, event, payload) => void io.to(`user:${userId}`).emit(event, payload),
    isOnline: (userId) => ids().includes(userId),
    onlineIds: ids,
  };
}
