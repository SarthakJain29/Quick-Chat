import { randomUUID } from "node:crypto";
import type { Message, NewMessage, StoredUser, User } from "../types.js";
import type { NewUser, Store } from "./Store.js";

export class MemoryStore implements Store {
  readonly kind = "memory" as const;
  private users = new Map<string, StoredUser>();
  private messages: Message[] = [];

  async createUser(data: NewUser): Promise<StoredUser> {
    const user: StoredUser = {
      id: randomUUID(),
      email: data.email.toLowerCase(),
      fullName: data.fullName,
      bio: data.bio,
      profilePic: data.profilePic ?? "",
      isBot: data.isBot ?? false,
      persona: data.persona,
      passwordHash: data.passwordHash,
      createdAt: new Date().toISOString(),
    };
    this.users.set(user.id, user);
    return user;
  }

  async findUserByEmail(email: string) {
    const e = email.toLowerCase();
    return [...this.users.values()].find((u) => u.email === e) ?? null;
  }

  async findUserById(id: string) {
    return this.users.get(id) ?? null;
  }

  async listUsers(): Promise<User[]> {
    return [...this.users.values()].map(stripHash);
  }

  async updateUser(id: string, patch: Partial<Pick<User, "fullName" | "bio" | "profilePic">>) {
    const u = this.users.get(id);
    if (!u) return null;
    Object.assign(u, patch);
    return stripHash(u);
  }

  async createMessage(data: NewMessage): Promise<Message> {
    const m: Message = {
      id: randomUUID(),
      senderId: data.senderId,
      receiverId: data.receiverId,
      text: data.text ?? "",
      image: data.image ?? "",
      seen: false,
      reactions: {},
      createdAt: new Date().toISOString(),
    };
    this.messages.push(m);
    return m;
  }

  async getMessage(id: string) {
    return this.messages.find((m) => m.id === id) ?? null;
  }

  async listConversation(a: string, b: string, limit = 200) {
    return this.messages
      .filter((m) => (m.senderId === a && m.receiverId === b) || (m.senderId === b && m.receiverId === a))
      .slice(-limit);
  }

  async markSeen(from: string, to: string) {
    const changed: string[] = [];
    for (const m of this.messages) {
      if (m.senderId === from && m.receiverId === to && !m.seen) {
        m.seen = true;
        changed.push(m.id);
      }
    }
    return changed;
  }

  async toggleReaction(messageId: string, userId: string, emoji: string) {
    const m = await this.getMessage(messageId);
    if (!m) return null;
    const list = m.reactions[emoji] ?? [];
    const next = list.includes(userId) ? list.filter((id) => id !== userId) : [...list, userId];
    if (next.length) m.reactions[emoji] = next;
    else delete m.reactions[emoji];
    return m;
  }

  async conversationSummaries(userId: string) {
    const out: Record<string, { lastMessage: Message; unseen: number }> = {};
    for (const m of this.messages) {
      if (m.senderId !== userId && m.receiverId !== userId) continue;
      const other = m.senderId === userId ? m.receiverId : m.senderId;
      const entry = out[other] ?? { lastMessage: m, unseen: 0 };
      entry.lastMessage = m;
      if (m.receiverId === userId && !m.seen) entry.unseen++;
      out[other] = entry;
    }
    return out;
  }
}

function stripHash(u: StoredUser): User {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...rest } = u;
  return rest;
}
