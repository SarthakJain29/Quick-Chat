/**
 * Offline "mock mode" behaviour. Deliberately simple and deterministic so the whole
 * app (smart replies, summaries, rewrite, bot personas) works without any API key.
 */
export interface Line {
  from: "me" | "them";
  text: string;
}

export type Tone = "friendly" | "professional" | "concise" | "playful";
export const TONES: Tone[] = ["friendly", "professional", "concise", "playful"];

const hash = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
const pick = <T>(arr: T[], seed: string) => arr[hash(seed) % arr.length];

export function mockSmartReplies(history: Line[]): string[] {
  const last = [...history].reverse().find((l) => l.from === "them")?.text.trim() ?? "";
  if (!last) return ["Hey! How's it going?", "Hi there 👋", "What's up?"];
  const lower = last.toLowerCase();
  if (last.endsWith("?")) {
    if (/\b(when|what time)\b/.test(lower)) return ["Tomorrow works for me", "Let me check and get back to you", "How about this evening?"];
    if (/\b(can|could|would|will) you\b/.test(lower)) return ["Yes, happy to!", "Sure, give me a moment", "I'll look into it 👍"];
    return ["Yes, definitely", "Not sure yet, let me think", "Good question — what do you think?"];
  }
  if (/\b(thanks|thank you|thx)\b/.test(lower)) return ["Anytime!", "You're welcome 😊", "Happy to help"];
  if (/\b(hi|hello|hey)\b/.test(lower)) return ["Hey! How are you?", "Hi 👋 what's new?", "Hello! Good to hear from you"];
  if (/\b(sorry|oops)\b/.test(lower)) return ["No worries at all", "All good!", "Don't sweat it"];
  return ["Sounds good!", "Got it, thanks 👍", "Interesting — tell me more"];
}

export function mockSummary(history: Line[], otherName: string): string {
  if (!history.length) return "No messages yet — say hello to start the conversation.";
  const mine = history.filter((l) => l.from === "me").length;
  const theirs = history.length - mine;
  const questions = history.filter((l) => l.text.includes("?")).slice(-2).map((l) => `“${truncate(l.text, 70)}”`);
  const last = truncate(history[history.length - 1].text || "(image)", 90);
  const lines = [
    `• ${history.length} messages with ${otherName} (${mine} from you, ${theirs} from them).`,
    questions.length ? `• Recent questions: ${questions.join(", ")}.` : "• No open questions detected.",
    `• Latest message: “${last}”.`,
  ];
  return lines.join("\n");
}

const truncate = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);

export function mockRewrite(text: string, tone: Tone): string {
  const t = text.trim();
  if (!t) return t;
  const sentence = /[.!?]$/.test(t) ? t : t + ".";
  const cap = sentence[0].toUpperCase() + sentence.slice(1);
  switch (tone) {
    case "professional":
      return `Hello, ${cap[0].toLowerCase() + cap.slice(1)} Thank you.`;
    case "friendly":
      return `Hey! ${cap} 😊`;
    case "playful":
      return `${cap.replace(/[.!?]$/, "")}! ✨🎉`;
    case "concise":
      return truncate(t.replace(/\b(really|very|just|actually|basically|kind of|sort of)\s+/gi, ""), 80);
  }
}

const PERSONA_REPLIES: Record<string, string[]> = {
  default: ["Ha, nice! Tell me more.", "That's interesting — how come?", "Totally get that 😄", "Okay, I'm with you. What next?"],
  greeting: ["Hey hey! Great to hear from you 👋", "Hi! How's your day going?", "Hello! What's new?"],
  question: ["Good question! Honestly I'd say it depends — what's your gut feeling?", "Hmm, let me think… I lean yes. You?", "Great question, I'd love to dig into that with you."],
  thanks: ["Anytime! 😊", "Happy to help!", "Of course!"],
};

export function mockPersonaReply(name: string, history: Line[]): string {
  const last = [...history].reverse().find((l) => l.from === "them")?.text ?? "";
  const lower = last.toLowerCase();
  if (!last) return `Hi, I'm ${name}! Say something and I'll reply.`;
  if (/\b(hi|hello|hey|yo)\b/.test(lower)) return pick(PERSONA_REPLIES.greeting, last);
  if (/\b(thanks|thank you)\b/.test(lower)) return pick(PERSONA_REPLIES.thanks, last);
  if (last.includes("?")) return pick(PERSONA_REPLIES.question, last);
  return pick(PERSONA_REPLIES.default, last);
}
