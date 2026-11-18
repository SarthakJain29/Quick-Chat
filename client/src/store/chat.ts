import toast from "react-hot-toast";
import type { Socket } from "socket.io-client";
import { create } from "zustand";
import { api, errorMessage } from "../lib/api";
import { getSocket } from "../lib/socket";
import type { Chat, Message } from "../lib/types";
import { appendUnique, applyMessageToChats, markMessagesSeen, replaceMessage, updateLastMessage } from "./chatLogic";

type Status = "idle" | "loading" | "ready" | "error";

interface ChatState {
  myId: string | null;
  chats: Chat[];
  chatsStatus: Status;
  online: string[];
  selectedId: string | null;
  messages: Message[];
  messagesStatus: Status;
  typing: Record<string, boolean>;

  attachSocket: (socket: Socket, myId: string) => void;
  reset: () => void;
  loadChats: () => Promise<void>;
  select: (id: string | null) => Promise<void>;
  send: (payload: { text?: string; image?: string }) => Promise<void>;
  retry: (tempId: string) => Promise<void>;
  react: (messageId: string, emoji: string) => Promise<void>;
  setTyping: (isTyping: boolean) => void;
}

const initial = {
  myId: null, chats: [], chatsStatus: "idle" as Status, online: [], selectedId: null,
  messages: [], messagesStatus: "idle" as Status, typing: {},
};

let typingSentAt = 0;

export const useChat = create<ChatState>((set, get) => ({
  ...initial,

  attachSocket(socket, myId) {
    set({ myId });
    socket.off();
    socket.on("presence", (online: string[]) => set({ online }));
    socket.on("typing", ({ from, isTyping }: { from: string; isTyping: boolean }) =>
      set((s) => ({ typing: { ...s.typing, [from]: isTyping } })),
    );
    socket.on("message:new", (msg: Message) => {
      const s = get();
      const open = s.selectedId === msg.senderId;
      set({
        chats: applyMessageToChats(s.chats, msg, myId, s.selectedId),
        messages: open ? appendUnique(s.messages, { ...msg, seen: true }) : s.messages,
        typing: { ...s.typing, [msg.senderId]: false },
      });
      if (open) void api.markSeen(msg.senderId).catch(() => undefined);
    });
    socket.on("message:seen", ({ ids }: { ids: string[] }) => set((s) => ({ messages: markMessagesSeen(s.messages, ids) })));
    socket.on("message:reaction", (msg: Message) =>
      set((s) => ({ messages: s.messages.map((m) => (m.id === msg.id ? msg : m)), chats: updateLastMessage(s.chats, msg) })),
    );
    // After a reconnect we may have missed events; resync the sidebar.
    socket.io.on("reconnect", () => void get().loadChats());
  },

  reset: () => set({ ...initial }),

  async loadChats() {
    if (get().chats.length === 0) set({ chatsStatus: "loading" });
    try {
      const { chats, online } = await api.chats();
      set({ chats, online, chatsStatus: "ready" });
    } catch (e) {
      set({ chatsStatus: "error" });
      toast.error(errorMessage(e), { id: "chats-error" });
    }
  },

  async select(id) {
    set({ selectedId: id, messages: [], messagesStatus: id ? "loading" : "idle" });
    if (!id) return;
    try {
      const messages = await api.messages(id);
      if (get().selectedId !== id) return; // user already switched
      set((s) => ({ messages, messagesStatus: "ready", chats: s.chats.map((c) => (c.user.id === id ? { ...c, unseen: 0 } : c)) }));
    } catch (e) {
      if (get().selectedId === id) set({ messagesStatus: "error" });
      toast.error(errorMessage(e), { id: "messages-error" });
    }
  },

  async send(payload) {
    const { selectedId, myId } = get();
    if (!selectedId || !myId) return;
    const temp: Message = {
      id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      senderId: myId, receiverId: selectedId, text: payload.text ?? "", image: payload.image ?? "",
      seen: false, reactions: {}, createdAt: new Date().toISOString(), status: "sending",
    };
    set((s) => ({ messages: [...s.messages, temp] }));
    await deliver(temp, get, set);
  },

  async retry(tempId) {
    const temp = get().messages.find((m) => m.id === tempId);
    if (!temp) return;
    set((s) => ({ messages: s.messages.map((m) => (m.id === tempId ? { ...m, status: "sending" } : m)) }));
    await deliver(temp, get, set);
  },

  async react(messageId, emoji) {
    const { myId } = get();
    if (!myId) return;
    const flip = (m: Message): Message => {
      const list = m.reactions[emoji] ?? [];
      const next = list.includes(myId) ? list.filter((i) => i !== myId) : [...list, myId];
      const reactions = { ...m.reactions, [emoji]: next };
      if (!next.length) delete reactions[emoji];
      return { ...m, reactions };
    };
    const before = get().messages;
    set({ messages: before.map((m) => (m.id === messageId ? flip(m) : m)) }); // optimistic
    try {
      await api.react(messageId, emoji);
    } catch (e) {
      set({ messages: before });
      toast.error(errorMessage(e));
    }
  },

  setTyping(isTyping) {
    const { selectedId } = get();
    const socket = getSocket();
    if (!selectedId || !socket) return;
    const now = Date.now();
    if (isTyping && now - typingSentAt < 2000) return; // throttle
    typingSentAt = isTyping ? now : 0;
    socket.emit("typing", { to: selectedId, isTyping });
  },
}));

async function deliver(temp: Message, get: () => ChatState, set: (p: Partial<ChatState> | ((s: ChatState) => Partial<ChatState>)) => void) {
  try {
    const real = await api.send(temp.receiverId, { text: temp.text || undefined, image: temp.image || undefined });
    set((s) => ({
      messages: s.selectedId === temp.receiverId ? replaceMessage(s.messages, temp.id, real) : s.messages,
      chats: applyMessageToChats(s.chats, real, s.myId ?? "", s.selectedId),
    }));
  } catch (e) {
    set((s) => ({ messages: s.messages.map((m) => (m.id === temp.id ? { ...m, status: "failed" as const } : m)) }));
    toast.error(errorMessage(e));
  }
  void get;
}
