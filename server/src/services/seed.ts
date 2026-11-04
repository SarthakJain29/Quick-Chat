import bcrypt from "bcryptjs";
import type { Store } from "../store/Store.js";

export const AI_BOT_EMAIL = "quick-ai@bots.quickchat.local";

const BOTS = [
  {
    email: AI_BOT_EMAIL,
    fullName: "Quick AI",
    bio: "Your built-in assistant. Ask me anything ✨",
    persona: "You are Quick AI, a friendly, concise and helpful assistant inside the QuickChat app.",
  },
  {
    email: "alison@bots.quickchat.local",
    fullName: "Alison Rivera",
    bio: "Designer ☕ coffee-powered, always sketching",
    persona: "You are Alison, a warm, witty product designer who loves coffee, typography and weekend hikes.",
  },
  {
    email: "marco@bots.quickchat.local",
    fullName: "Marco Bianchi",
    bio: "Backend dev. Pizza > everything.",
    persona: "You are Marco, a laid-back backend developer who jokes about pizza and uptime.",
  },
  {
    email: "enrique@bots.quickchat.local",
    fullName: "Enrique Vega",
    bio: "Travelling the world one flight at a time ✈️",
    persona: "You are Enrique, an adventurous travel photographer who answers with short vivid stories.",
  },
];

/** Idempotently creates the bot contacts so a fresh install is never an empty room. */
export async function seedBots(store: Store): Promise<void> {
  const hash = await bcrypt.hash(`bot-${Math.random()}`, 4); // unguessable: bots can't log in
  for (const b of BOTS) {
    if (!(await store.findUserByEmail(b.email))) {
      await store.createUser({ ...b, passwordHash: hash, isBot: true, profilePic: "" });
    }
  }
}

/** Demo account for the in-memory store only. */
export async function seedDemoUser(store: Store): Promise<void> {
  const email = "demo@quickchat.dev";
  if (await store.findUserByEmail(email)) return;
  const demo = await store.createUser({
    email,
    fullName: "Demo User",
    bio: "Just exploring QuickChat",
    passwordHash: await bcrypt.hash("demo1234", 10),
  });
  const alison = await store.findUserByEmail("alison@bots.quickchat.local");
  if (alison) {
    await store.createMessage({ senderId: alison.id, receiverId: demo.id, text: "Hey! Did you get a chance to look at the new mockups?" });
    await store.createMessage({ senderId: demo.id, receiverId: alison.id, text: "Yes! The gradients are beautiful 😍" });
    await store.createMessage({ senderId: alison.id, receiverId: demo.id, text: "Haha thanks. Want to grab coffee Friday and go through the details?" });
  }
}
