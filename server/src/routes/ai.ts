import { Router } from "express";
import { z } from "zod";
import { TONES, type Line, type Tone } from "../ai/index.js";
import type { AppContext } from "../context.js";
import { notFound } from "../errors.js";
import { requireAuth } from "../middleware/auth.js";

const peerSchema = z.object({ userId: z.string().min(1) });
const rewriteSchema = z.object({ text: z.string().trim().min(1).max(1000), tone: z.enum(TONES as [Tone, ...Tone[]]) });

export function aiRoutes(ctx: AppContext) {
  const r = Router();
  r.use(requireAuth(ctx));

  const load = async (me: string, otherId: string) => {
    const other = await ctx.store.findUserById(otherId);
    if (!other) throw notFound("User not found");
    const convo = await ctx.store.listConversation(me, other.id, 40);
    const history: Line[] = convo.map((m) => ({ from: m.senderId === me ? "me" : "them", text: m.text }));
    return { other, history };
  };

  r.get("/status", (_req, res) => res.json({ provider: ctx.ai.providerName, tones: TONES }));

  r.post("/smart-replies", async (req, res) => {
    const { userId } = peerSchema.parse(req.body);
    const { history } = await load(req.user!.id, userId);
    res.json({ replies: await ctx.ai.smartReplies(history) });
  });

  r.post("/summary", async (req, res) => {
    const { userId } = peerSchema.parse(req.body);
    const { history, other } = await load(req.user!.id, userId);
    res.json({ summary: await ctx.ai.summarize(history, other.fullName) });
  });

  r.post("/rewrite", async (req, res) => {
    const { text, tone } = rewriteSchema.parse(req.body);
    res.json({ text: await ctx.ai.rewrite(text, tone) });
  });

  return r;
}
