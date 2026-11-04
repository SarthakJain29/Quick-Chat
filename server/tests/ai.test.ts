import { describe, expect, it } from "vitest";
import { createAIService, parseJsonLoose } from "../src/ai/index.js";
import { mockRewrite, mockSmartReplies } from "../src/ai/heuristics.js";
import { MockProvider, createProvider } from "../src/ai/providers.js";
import type { AIProvider } from "../src/ai/provider.js";

const cfg = { provider: "auto", geminiKey: "", geminiModel: "m", groqKey: "", groqModel: "m" };

describe("provider selection", () => {
  it("falls back to mock without keys", () => expect(createProvider(cfg).name).toBe("mock"));
  it("prefers gemini then groq in auto mode", () => {
    expect(createProvider({ ...cfg, geminiKey: "k", groqKey: "k" }).name).toBe("gemini");
    expect(createProvider({ ...cfg, groqKey: "k" }).name).toBe("groq");
  });
  it("honours an explicit provider", () => expect(createProvider({ ...cfg, provider: "groq", geminiKey: "k", groqKey: "k" }).name).toBe("groq"));
  it("mock mode when forced even if a key exists", () => expect(createProvider({ ...cfg, provider: "mock", geminiKey: "k" }).name).toBe("mock"));
});

describe("parseJsonLoose", () => {
  it("parses fenced JSON", () => expect(parseJsonLoose<string[]>('```json\n["a","b"]\n```')).toEqual(["a", "b"]));
  it("parses JSON surrounded by prose", () => expect(parseJsonLoose<string[]>('Sure! ["x"] hope it helps')).toEqual(["x"]));
  it("returns null for garbage", () => expect(parseJsonLoose("no json here")).toBeNull());
});

describe("AI service", () => {
  const history = [{ from: "them" as const, text: "Can you review my PR?" }];
  it("works fully offline", async () => {
    const ai = createAIService(new MockProvider());
    const replies = await ai.smartReplies(history);
    expect(replies).toHaveLength(3);
    expect(await ai.summarize(history, "Sam")).toContain("Sam");
    expect(await ai.rewrite("send it over", "friendly")).toContain("😊");
  });
  it("uses the model output when it is valid", async () => {
    const p: AIProvider = { name: "gemini", complete: async () => '["One","Two","Three","Four"]' };
    expect(await createAIService(p).smartReplies(history)).toEqual(["One", "Two", "Three"]);
  });
  it("falls back to heuristics when the provider fails or returns junk", async () => {
    const failing: AIProvider = { name: "groq", complete: async () => { throw new Error("429"); } };
    expect(await createAIService(failing).smartReplies(history)).toEqual(mockSmartReplies(history));
    const junk: AIProvider = { name: "groq", complete: async () => "lol" };
    expect(await createAIService(junk).smartReplies(history)).toEqual(mockSmartReplies(history));
  });
});

describe("heuristics", () => {
  it("rewrite concise strips filler", () => expect(mockRewrite("this is really very good", "concise")).toBe("this is good"));
  it("greets when there is no history", () => expect(mockSmartReplies([])).toHaveLength(3));
});
