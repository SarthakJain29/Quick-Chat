import { Router } from "express";
import { z } from "zod";
import type { AppContext } from "../context.js";
import { badRequest, notFound } from "../errors.js";
import { requireAuth } from "../middleware/auth.js";
import { toPublic } from "../services/auth.js";
import type { ChatSummary } from "../types.js";

const sendSchema = z
  .object({ text: z.string().trim().max(2000).optional(), image: z.string().optional() })
  .refine((b) => b.text || b.image, { message: "Message cannot be empty" });
const reactionSchema = z.object({ emoji: z.enum(["👍", "❤️", "😂", "😮", "😢", "🔥"]) });

export function messageRoutes(ctx: AppContext) {
  const r = Router();
  r.use(requireAuth(ctx));

  /** Sidebar data in one round trip: every contact + last message + unseen count. */
  r.get("/chats", async (req, res) => {
    const me = req.user!.id;
    const [users, summaries] = await Promise.all([ctx.store.listUsers(), ctx.store.conversationSummaries(me)]);
    const chats: ChatSummary[] = users
      .filter((u) => u.id !== me)
      .map((u) => ({ user: toPublic(u), lastMessage: summaries[u.id]?.lastMessage ?? null, unseen: summaries[u.id]?.unseen ?? 0 }))
      .sort((a, b) => (b.lastMessage?.createdAt ?? "").localeCompare(a.lastMessage?.createdAt ?? "") || a.user.fullName.localeCompare(b.user.fullName));
    res.json({ chats, online: ctx.realtime.onlineIds() });
  });

  r.get("/:userId", async (req, res) => {
    const other = await ctx.store.findUserById(String(req.params.userId));
    if (!other) throw notFound("User not found");
    const messages = await ctx.store.listConversation(req.user!.id, other.id);
    // Opening a conversation marks incoming messages as seen and tells the sender.
    const ids = await ctx.store.markSeen(other.id, req.user!.id);
    if (ids.length) ctx.realtime.emitToUser(other.id, "message:seen", { by: req.user!.id, ids });
    res.json({ messages: messages.map((m) => (ids.includes(m.id) ? { ...m, seen: true } : m)) });
  });

  r.post("/:userId", async (req, res) => {
    const body = sendSchema.parse(req.body);
    const receiver = await ctx.store.findUserById(String(req.params.userId));
    if (!receiver) throw notFound("User not found");
    if (receiver.id === req.user!.id) throw badRequest("You can't message yourself");
    const image = body.image ? await ctx.media.upload(body.image) : "";
    const message = await ctx.store.createMessage({ senderId: req.user!.id, receiverId: receiver.id, text: body.text, image });
    ctx.realtime.emitToUser(receiver.id, "message:new", message);
    ctx.onMessage?.(req.user!.id, receiver.id);
    res.status(201).json({ message });
  });

  r.put("/:userId/seen", async (req, res) => {
    const ids = await ctx.store.markSeen(String(req.params.userId), req.user!.id);
    if (ids.length) ctx.realtime.emitToUser(String(req.params.userId), "message:seen", { by: req.user!.id, ids });
    res.json({ ids });
  });

  r.post("/:messageId/reactions", async (req, res) => {
    const { emoji } = reactionSchema.parse(req.body);
    const existing = await ctx.store.getMessage(String(req.params.messageId));
    // Only the two participants may react.
    if (!existing || (existing.senderId !== req.user!.id && existing.receiverId !== req.user!.id)) throw notFound("Message not found");
    const message = await ctx.store.toggleReaction(existing.id, req.user!.id, emoji);
    const other = existing.senderId === req.user!.id ? existing.receiverId : existing.senderId;
    ctx.realtime.emitToUser(other, "message:reaction", message);
    res.json({ message });
  });

  return r;
}
