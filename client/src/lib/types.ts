export interface User {
  id: string;
  fullName: string;
  bio: string;
  profilePic: string;
  isBot: boolean;
  email?: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  image: string;
  seen: boolean;
  reactions: Record<string, string[]>;
  createdAt: string;
  /** client-only delivery state for optimistic sends */
  status?: "sending" | "failed";
}

export interface Chat {
  user: User;
  lastMessage: Message | null;
  unseen: number;
}

export type Tone = "friendly" | "professional" | "concise" | "playful";
export const REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥"] as const;
