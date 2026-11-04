import axios, { AxiosError } from "axios";
import type { Chat, Message, Tone, User } from "./types";

export const BACKEND_URL: string = import.meta.env.VITE_BACKEND_URL ?? "";
const TOKEN_KEY = "quickchat.token";

export const http = axios.create({ baseURL: BACKEND_URL, timeout: 20_000 });

export const tokenStore = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (t: string | null) => {
    try {
      if (t) localStorage.setItem(TOKEN_KEY, t);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* storage blocked: session just won't persist */
    }
  },
};

http.interceptors.request.use((cfg) => {
  const t = tokenStore.get();
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

/** Turns any thrown value into a message that is safe to show in a toast. */
export function errorMessage(err: unknown): string {
  if (err instanceof AxiosError) {
    if (err.response?.data?.message) return String(err.response.data.message);
    if (err.code === "ECONNABORTED") return "The server took too long to respond";
    if (!err.response) return "Can't reach the server. Check your connection.";
  }
  return err instanceof Error ? err.message : "Something went wrong";
}

export const api = {
  signup: (b: { fullName: string; email: string; password: string; bio: string }) =>
    http.post<{ token: string; user: User }>("/api/auth/signup", b).then((r) => r.data),
  login: (b: { email: string; password: string }) => http.post<{ token: string; user: User }>("/api/auth/login", b).then((r) => r.data),
  me: () => http.get<{ user: User }>("/api/auth/me").then((r) => r.data.user),
  updateProfile: (b: { fullName?: string; bio?: string; profilePic?: string }) =>
    http.put<{ user: User }>("/api/auth/profile", b).then((r) => r.data.user),
  chats: () => http.get<{ chats: Chat[]; online: string[] }>("/api/messages/chats").then((r) => r.data),
  messages: (userId: string) => http.get<{ messages: Message[] }>(`/api/messages/${userId}`).then((r) => r.data.messages),
  send: (userId: string, b: { text?: string; image?: string }) => http.post<{ message: Message }>(`/api/messages/${userId}`, b).then((r) => r.data.message),
  markSeen: (userId: string) => http.put(`/api/messages/${userId}/seen`),
  react: (messageId: string, emoji: string) => http.post<{ message: Message }>(`/api/messages/${messageId}/reactions`, { emoji }).then((r) => r.data.message),
  aiStatus: () => http.get<{ provider: string }>("/api/ai/status").then((r) => r.data),
  smartReplies: (userId: string) => http.post<{ replies: string[] }>("/api/ai/smart-replies", { userId }).then((r) => r.data.replies),
  summary: (userId: string) => http.post<{ summary: string }>("/api/ai/summary", { userId }).then((r) => r.data.summary),
  rewrite: (text: string, tone: Tone) => http.post<{ text: string }>("/api/ai/rewrite", { text, tone }).then((r) => r.data.text),
};
