import type { AIProvider, ChatTurn } from "./provider.js";
import { mockPersonaReply, mockRewrite, mockSmartReplies, mockSummary, TONES, type Line, type Tone } from "./heuristics.js";

export { TONES };
export type { Line, Tone };

export interface AIService {
  readonly providerName: AIProvider["name"];
  smartReplies(history: Line[]): Promise<string[]>;
  summarize(history: Line[], otherName: string): Promise<string>;
  rewrite(text: string, tone: Tone): Promise<string>;
  personaReply(persona: string, name: string, history: Line[]): Promise<string>;
}

const transcript = (history: Line[], otherName = "Them") =>
  history
    .slice(-30)
    .map((l) => `${l.from === "me" ? "Me" : otherName}: ${l.text || "[image]"}`)
    .join("\n");

/** Strips ``` fences and finds the first JSON array/object in a model reply. */
export function parseJsonLoose<T>(raw: string): T | null {
  const cleaned = raw.replace(/```(?:json)?/gi, "").trim();
  const start = cleaned.search(/[[{]/);
  if (start < 0) return null;
  for (let end = cleaned.length; end > start; end--) {
    try {
      return JSON.parse(cleaned.slice(start, end)) as T;
    } catch {
      /* keep trimming */
    }
  }
  return null;
}

/** Wraps a provider with prompts + graceful fallback to offline heuristics on ANY failure. */
export function createAIService(provider: AIProvider): AIService {
  const ask = (turns: ChatTurn[], opts?: Parameters<AIProvider["complete"]>[1]) => provider.complete(turns, opts);

  return {
    providerName: provider.name,

    async smartReplies(history) {
      try {
        const raw = await ask(
          [
            {
              role: "system",
              content:
                'You write quick-reply suggestions for a chat app. Reply ONLY with a JSON array of exactly 3 short (max 8 words) replies that "Me" could send next. No commentary.',
            },
            { role: "user", content: transcript(history) },
          ],
          { json: false, temperature: 0.8, maxTokens: 120 },
        );
        const arr = parseJsonLoose<unknown[]>(raw);
        const clean = (Array.isArray(arr) ? arr : []).filter((x): x is string => typeof x === "string" && !!x.trim()).slice(0, 3);
        if (clean.length) return clean;
      } catch {
        /* fall through */
      }
      return mockSmartReplies(history);
    },

    async summarize(history, otherName) {
      if (!history.length) return mockSummary(history, otherName);
      try {
        return await ask(
          [
            { role: "system", content: "Summarize this chat in 3 concise bullet points starting with '• '. Mention decisions and open questions. No preamble." },
            { role: "user", content: transcript(history, otherName) },
          ],
          { temperature: 0.3, maxTokens: 220 },
        );
      } catch {
        return mockSummary(history, otherName);
      }
    },

    async rewrite(text, tone) {
      try {
        return (
          await ask(
            [
              { role: "system", content: `Rewrite the user's chat message in a ${tone} tone. Keep the meaning and language. Reply with ONLY the rewritten message.` },
              { role: "user", content: text },
            ],
            { temperature: 0.6, maxTokens: 200 },
          )
        ).replace(/^["']|["']$/g, "");
      } catch {
        return mockRewrite(text, tone);
      }
    },

    async personaReply(persona, name, history) {
      try {
        const turns: ChatTurn[] = [
          { role: "system", content: `${persona}\nYou are ${name} in a casual chat app. Reply in 1-2 short sentences, like a real text message.` },
          ...history.slice(-12).map<ChatTurn>((l) => ({ role: l.from === "me" ? "assistant" : "user", content: l.text || "[sent an image]" })),
        ];
        // Note: "me" in Line terms is the *bot*, so roles map as above.
        return await ask(turns, { temperature: 0.9, maxTokens: 140 });
      } catch {
        return mockPersonaReply(name, history);
      }
    },
  };
}
