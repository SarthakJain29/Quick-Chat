import type { AIService, Line } from "../ai/index.js";
import type { Store } from "../store/Store.js";
import type { Realtime } from "./realtime.js";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * When a human messages a bot, the bot "types" for a moment and answers
 * (LLM if configured, canned persona replies otherwise).
 */
export function createBotReplier(deps: { store: Store; ai: AIService; realtime: Realtime; delayMs?: number }) {
  const { store, ai, realtime } = deps;
  const delay = deps.delayMs ?? 900;

  return async function maybeReply(humanId: string, botId: string): Promise<void> {
    const bot = await store.findUserById(botId);
    if (!bot?.isBot) return;
    try {
      realtime.emitToUser(humanId, "typing", { from: botId, isTyping: true });
      // The human has just seen their own message arrive at the bot.
      const seenIds = await store.markSeen(humanId, botId);
      if (seenIds.length) realtime.emitToUser(humanId, "message:seen", { by: botId, ids: seenIds });

      const convo = await store.listConversation(humanId, botId, 30);
      // From the bot's perspective: bot = "me".
      const history: Line[] = convo.map((m) => ({ from: m.senderId === botId ? "me" : "them", text: m.text }));
      const [reply] = await Promise.all([ai.personaReply(bot.persona ?? "", bot.fullName, history), sleep(delay)]);

      const msg = await store.createMessage({ senderId: botId, receiverId: humanId, text: reply.slice(0, 1000) });
      realtime.emitToUser(humanId, "typing", { from: botId, isTyping: false });
      realtime.emitToUser(humanId, "message:new", msg);
    } catch (err) {
      console.error("bot reply failed:", (err as Error).message);
      realtime.emitToUser(humanId, "typing", { from: botId, isTyping: false });
    }
  };
}

