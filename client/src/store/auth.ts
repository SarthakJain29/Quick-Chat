import toast from "react-hot-toast";
import { create } from "zustand";
import { api, errorMessage, tokenStore } from "../lib/api";
import { connectSocket, disconnectSocket } from "../lib/socket";
import type { User } from "../lib/types";
import { useChat } from "./chat";

interface AuthState {
  user: User | null;
  /** true until the first session check finishes, so we don't flash the login page */
  booting: boolean;
  busy: boolean;
  boot: () => Promise<void>;
  signIn: (mode: "login" | "signup", body: { email: string; password: string; fullName?: string; bio?: string }) => Promise<boolean>;
  signOut: () => void;
  updateProfile: (b: { fullName?: string; bio?: string; profilePic?: string }) => Promise<boolean>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  booting: true,
  busy: false,

  async boot() {
    const token = tokenStore.get();
    if (!token) return set({ booting: false });
    try {
      const user = await api.me();
      set({ user, booting: false });
      useChat.getState().attachSocket(connectSocket(token), user.id);
    } catch {
      tokenStore.set(null); // expired or revoked
      set({ user: null, booting: false });
    }
  },

  async signIn(mode, body) {
    set({ busy: true });
    try {
      const res = mode === "login" ? await api.login({ email: body.email, password: body.password }) : await api.signup({ fullName: body.fullName ?? "", bio: body.bio ?? "", email: body.email, password: body.password });
      tokenStore.set(res.token);
      set({ user: res.user, busy: false });
      useChat.getState().attachSocket(connectSocket(res.token), res.user.id);
      toast.success(mode === "login" ? `Welcome back, ${res.user.fullName.split(" ")[0]}!` : "Account created. Say hi 👋");
      return true;
    } catch (e) {
      toast.error(errorMessage(e));
      set({ busy: false });
      return false;
    }
  },

  signOut() {
    tokenStore.set(null);
    disconnectSocket();
    useChat.getState().reset();
    set({ user: null });
  },

  async updateProfile(b) {
    try {
      set({ user: await api.updateProfile(b) });
      toast.success("Profile saved");
      return true;
    } catch (e) {
      toast.error(errorMessage(e));
      return false;
    }
  },
}));
