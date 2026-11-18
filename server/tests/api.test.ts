import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createAIService } from "../src/ai/index.js";
import { MockProvider } from "../src/ai/providers.js";
import { createApp } from "../src/app.js";
import type { AppContext } from "../src/context.js";
import { createMedia, validateImageDataUrl } from "../src/services/media.js";
import { NoopRealtime } from "../src/services/realtime.js";
import { seedBots } from "../src/services/seed.js";
import { MemoryStore } from "../src/store/MemoryStore.js";

const PNG = "data:image/png;base64,iVBORw0KGgo=";
let ctx: AppContext;
let realtime: NoopRealtime;
let app: ReturnType<typeof createApp>;

beforeEach(async () => {
  const store = new MemoryStore();
  await seedBots(store);
  realtime = new NoopRealtime();
  ctx = { store, ai: createAIService(new MockProvider()), media: createMedia({ cloudName: "", apiKey: "", apiSecret: "" }), realtime, jwtSecret: "test" };
  app = createApp(ctx, { rateLimit: false });
});

async function signup(name: string, email = `${name}@x.io`) {
  const res = await request(app).post("/api/auth/signup").send({ fullName: name, email, password: "secret1" });
  return { token: res.body.token as string, user: res.body.user, res };
}
const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

describe("auth", () => {
  it("signs up, never leaks the hash, and logs in", async () => {
    const { res } = await signup("ann");
    expect(res.status).toBe(201);
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|password/);
    const login = await request(app).post("/api/auth/login").send({ email: "ann@x.io", password: "secret1" });
    expect(login.status).toBe(200);
  });
  it("rejects duplicates, bad passwords, unknown users (same message) and invalid input", async () => {
    await signup("ann");
    expect((await signup("ann")).res.status).toBe(409);
    const wrong = await request(app).post("/api/auth/login").send({ email: "ann@x.io", password: "nope" });
    const unknown = await request(app).post("/api/auth/login").send({ email: "ghost@x.io", password: "nope" });
    expect(wrong.status).toBe(401);
    expect(unknown.body.message).toBe(wrong.body.message);
    expect((await request(app).post("/api/auth/signup").send({ fullName: "x", email: "bad", password: "123" })).status).toBe(400);
  });
  it("blocks bots from logging in and requires a token", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "alison@bots.quickchat.local", password: "x" });
    expect(res.status).toBe(401);
    expect((await request(app).get("/api/messages/chats")).status).toBe(401);
    expect((await request(app).get("/api/messages/chats").set(auth("garbage"))).status).toBe(401);
  });
});

describe("messaging", () => {
  it("sends, lists, tracks unseen and marks seen with realtime events", async () => {
    const a = await signup("ann");
    const b = await signup("bob");
    const sent = await request(app).post(`/api/messages/${b.user.id}`).set(auth(a.token)).send({ text: "hi bob" });
    expect(sent.status).toBe(201);
    expect(realtime.events.find((e) => e.event === "message:new")?.userId).toBe(b.user.id);

    const chats = await request(app).get("/api/messages/chats").set(auth(b.token));
    const fromAnn = chats.body.chats.find((c: { user: { id: string } }) => c.user.id === a.user.id);
    expect(fromAnn.unseen).toBe(1);
    expect(fromAnn.lastMessage.text).toBe("hi bob");
    expect(chats.body.chats[0].user.id).toBe(a.user.id); // most recent chat first

    const convo = await request(app).get(`/api/messages/${a.user.id}`).set(auth(b.token));
    expect(convo.body.messages[0].seen).toBe(true);
    expect(realtime.events.some((e) => e.event === "message:seen" && e.userId === a.user.id)).toBe(true);
    const after = await request(app).get("/api/messages/chats").set(auth(b.token));
    expect(after.body.chats.find((c: { user: { id: string } }) => c.user.id === a.user.id).unseen).toBe(0);
  });
  it("validates empty messages, self-messages and unknown receivers", async () => {
    const a = await signup("ann");
    expect((await request(app).post(`/api/messages/${a.user.id}`).set(auth(a.token)).send({ text: "x" })).status).toBe(400);
    expect((await request(app).post("/api/messages/nope").set(auth(a.token)).send({ text: "x" })).status).toBe(404);
    const b = await signup("bob");
    expect((await request(app).post(`/api/messages/${b.user.id}`).set(auth(a.token)).send({ text: "  " })).status).toBe(400);
  });
  it("accepts images and rejects non-images", async () => {
    const a = await signup("ann");
    const b = await signup("bob");
    expect((await request(app).post(`/api/messages/${b.user.id}`).set(auth(a.token)).send({ image: PNG })).status).toBe(201);
    expect((await request(app).post(`/api/messages/${b.user.id}`).set(auth(a.token)).send({ image: "data:text/html;base64,AAAA" })).status).toBe(400);
  });
  it("toggles reactions for participants only", async () => {
    const a = await signup("ann");
    const b = await signup("bob");
    const c = await signup("cat");
    const { body } = await request(app).post(`/api/messages/${b.user.id}`).set(auth(a.token)).send({ text: "hey" });
    const id = body.message.id;
    const r1 = await request(app).post(`/api/messages/${id}/reactions`).set(auth(b.token)).send({ emoji: "🔥" });
    expect(r1.body.message.reactions["🔥"]).toEqual([b.user.id]);
    const r2 = await request(app).post(`/api/messages/${id}/reactions`).set(auth(b.token)).send({ emoji: "🔥" });
    expect(r2.body.message.reactions["🔥"]).toBeUndefined();
    expect((await request(app).post(`/api/messages/${id}/reactions`).set(auth(c.token)).send({ emoji: "🔥" })).status).toBe(404);
    expect((await request(app).post(`/api/messages/${id}/reactions`).set(auth(b.token)).send({ emoji: "💩" })).status).toBe(400);
  });
});

describe("AI + bots", () => {
  it("serves smart replies, summary and rewrite in mock mode", async () => {
    const a = await signup("ann");
    const bob = await signup("bob");
    await request(app).post(`/api/messages/${a.user.id}`).set(auth(bob.token)).send({ text: "Can you join at 5?" });
    const sr = await request(app).post("/api/ai/smart-replies").set(auth(a.token)).send({ userId: bob.user.id });
    expect(sr.body.replies).toHaveLength(3);
    expect((await request(app).post("/api/ai/summary").set(auth(a.token)).send({ userId: bob.user.id })).body.summary).toContain("bob");
    const rw = await request(app).post("/api/ai/rewrite").set(auth(a.token)).send({ text: "pls send", tone: "professional" });
    expect(rw.body.text).toMatch(/Thank you/);
    expect((await request(app).post("/api/ai/rewrite").set(auth(a.token)).send({ text: "x", tone: "angry" })).status).toBe(400);
    expect((await request(app).get("/api/ai/status").set(auth(a.token))).body.provider).toBe("mock");
  });
  it("notifies the bot hook when messaging a bot", async () => {
    const a = await signup("ann");
    const calls: string[][] = [];
    ctx.onMessage = (s, r) => calls.push([s, r]);
    const bot = (await ctx.store.listUsers()).find((u) => u.isBot)!;
    await request(app).post(`/api/messages/${bot.id}`).set(auth(a.token)).send({ text: "hello" });
    expect(calls).toEqual([[a.user.id, bot.id]]);
  });
});

describe("media validation", () => {
  it("rejects oversized images", () => {
    const big = "data:image/png;base64," + "A".repeat(5 * 1024 * 1024);
    expect(() => validateImageDataUrl(big)).toThrow(/too large/);
  });
});

it("health endpoint reports modes", async () => {
  const res = await request(app).get("/api/health");
  expect(res.body).toMatchObject({ ok: true, store: "memory", media: "inline", ai: "mock" });
});
