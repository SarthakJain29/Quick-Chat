import type { Config } from "../config.js";
import type { AIProvider, ChatTurn, CompleteOptions } from "./provider.js";

const TIMEOUT_MS = 12_000;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AiJson = any;

async function postJson(url: string, headers: Record<string, string>, body: unknown): Promise<AiJson> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`AI provider HTTP ${res.status}`);
  return res.json();
}

export class GeminiProvider implements AIProvider {
  readonly name = "gemini" as const;
  constructor(private key: string, private model: string) {}

  async complete(turns: ChatTurn[], opts: CompleteOptions = {}) {
    const system = turns.filter((t) => t.role === "system").map((t) => t.content).join("\n");
    const contents = turns
      .filter((t) => t.role !== "system")
      .map((t) => ({ role: t.role === "assistant" ? "model" : "user", parts: [{ text: t.content }] }));
    const data = await postJson(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`,
      { "x-goog-api-key": this.key },
      {
        systemInstruction: system ? { parts: [{ text: system }] } : undefined,
        contents,
        generationConfig: {
          temperature: opts.temperature ?? 0.7,
          maxOutputTokens: opts.maxTokens ?? 400,
          responseMimeType: opts.json ? "application/json" : undefined,
        },
      },
    );
    const text = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("");
    if (!text) throw new Error("Empty Gemini response");
    return text.trim();
  }
}

export class GroqProvider implements AIProvider {
  readonly name = "groq" as const;
  constructor(private key: string, private model: string) {}

  async complete(turns: ChatTurn[], opts: CompleteOptions = {}) {
    const data = await postJson(
      "https://api.groq.com/openai/v1/chat/completions",
      { Authorization: `Bearer ${this.key}` },
      {
        model: this.model,
        messages: turns,
        temperature: opts.temperature ?? 0.7,
        max_tokens: opts.maxTokens ?? 400,
        response_format: opts.json ? { type: "json_object" } : undefined,
      },
    );
    const text = data?.choices?.[0]?.message?.content;
    if (!text) throw new Error("Empty Groq response");
    return String(text).trim();
  }
}

/** Provider that always throws, so callers fall through to the offline heuristics. */
export class MockProvider implements AIProvider {
  readonly name = "mock" as const;
  async complete(): Promise<string> {
    throw new Error("mock provider has no model");
  }
}

export function createProvider(ai: Config["ai"]): AIProvider {
  const want = ai.provider;
  if ((want === "gemini" || want === "auto") && ai.geminiKey) return new GeminiProvider(ai.geminiKey, ai.geminiModel);
  if ((want === "groq" || want === "auto") && ai.groqKey) return new GroqProvider(ai.groqKey, ai.groqModel);
  return new MockProvider();
}
