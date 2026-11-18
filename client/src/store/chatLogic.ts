import type { Chat, Message } from "../lib/types";

/** Most recent conversation first; never-contacted users alphabetically at the bottom. */
export function sortChats(chats: Chat[]): Chat[] {
  return [...chats].sort(
    (a, b) => (b.lastMessage?.createdAt ?? "").localeCompare(a.lastMessage?.createdAt ?? "") || a.user.fullName.localeCompare(b.user.fullName),
  );
}

/** Folds a message into the chat list (preview, unread badge, ordering). */
export function applyMessageToChats(chats: Chat[], msg: Message, myId: string, openChatId: string | null): Chat[] {
  const otherId = msg.senderId === myId ? msg.receiverId : msg.senderId;
  const incoming = msg.senderId !== myId;
  return sortChats(
    chats.map((c) =>
      c.user.id !== otherId ? c : { ...c, lastMessage: msg, unseen: incoming && openChatId !== otherId ? c.unseen + 1 : incoming ? 0 : c.unseen },
    ),
  );
}

export const markMessagesSeen = (messages: Message[], ids: string[]): Message[] => {
  const set = new Set(ids);
  return messages.map((m) => (set.has(m.id) ? { ...m, seen: true } : m));
};

export const replaceMessage = (messages: Message[], oldId: string, next: Message): Message[] =>
  messages.map((m) => (m.id === oldId ? next : m));

/** Adds a message unless it is already present (socket + HTTP can race). */
export const appendUnique = (messages: Message[], m: Message): Message[] => (messages.some((x) => x.id === m.id) ? messages : [...messages, m]);

export const updateLastMessage = (chats: Chat[], m: Message): Chat[] =>
  chats.map((c) => (c.lastMessage?.id === m.id ? { ...c, lastMessage: m } : c));
