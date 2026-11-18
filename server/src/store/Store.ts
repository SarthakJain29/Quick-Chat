import type { Message, NewMessage, StoredUser, User } from "../types.js";

export interface NewUser {
  email: string;
  fullName: string;
  bio: string;
  passwordHash: string;
  profilePic?: string;
  isBot?: boolean;
  persona?: string;
}

/** Persistence boundary. Two implementations: in-memory (demo) and MongoDB. */
export interface Store {
  readonly kind: "memory" | "mongo";
  createUser(data: NewUser): Promise<StoredUser>;
  findUserByEmail(email: string): Promise<StoredUser | null>;
  findUserById(id: string): Promise<StoredUser | null>;
  listUsers(): Promise<User[]>;
  updateUser(id: string, patch: Partial<Pick<User, "fullName" | "bio" | "profilePic">>): Promise<User | null>;

  createMessage(data: NewMessage): Promise<Message>;
  getMessage(id: string): Promise<Message | null>;
  /** Oldest -> newest. */
  listConversation(a: string, b: string, limit?: number): Promise<Message[]>;
  /** Marks messages sent by `from` to `to` as seen; returns ids that changed. */
  markSeen(from: string, to: string): Promise<string[]>;
  /** Toggles `userId`'s `emoji` reaction; returns updated message. */
  toggleReaction(messageId: string, userId: string, emoji: string): Promise<Message | null>;
  /** Latest message and unseen count per counterpart for `userId`. */
  conversationSummaries(userId: string): Promise<Record<string, { lastMessage: Message; unseen: number }>>;
}
