export interface User {
  id: string;
  email: string;
  fullName: string;
  bio: string;
  profilePic: string;
  isBot: boolean;
  /** System prompt describing how a bot user talks. Never sent to clients. */
  persona?: string;
  createdAt: string;
}

export interface StoredUser extends User {
  passwordHash: string;
}

/** What clients see: no persona, no hash. */
export type PublicUser = Omit<User, "persona" | "email"> & { email?: string };

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  image: string;
  seen: boolean;
  /** emoji -> ids of users who reacted */
  reactions: Record<string, string[]>;
  createdAt: string;
}

export interface NewMessage {
  senderId: string;
  receiverId: string;
  text?: string;
  image?: string;
}

export interface ChatSummary {
  user: PublicUser;
  lastMessage: Message | null;
  unseen: number;
}
