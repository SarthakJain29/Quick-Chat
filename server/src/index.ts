import http from "node:http";
import { createAIService } from "./ai/index.js";
import { createProvider } from "./ai/providers.js";
import { createApp } from "./app.js";
import { config } from "./config.js";
import type { AppContext } from "./context.js";
import { createBotReplier } from "./services/bots.js";
import { createMedia } from "./services/media.js";
import { createRealtime } from "./services/realtime.js";
import { seedBots, seedDemoUser } from "./services/seed.js";
import { MemoryStore } from "./store/MemoryStore.js";
import { MongoStore } from "./store/MongoStore.js";
import type { Store } from "./store/Store.js";

async function createStore(): Promise<Store> {
  if (config.mongoUri) {
    try {
      const s = await MongoStore.connect(config.mongoUri);
      console.log("✔ MongoDB connected");
      return s;
    } catch (err) {
      console.warn(`✖ MongoDB unavailable (${(err as Error).message}); falling back to in-memory demo store`);
    }
  }
  console.log("ℹ Using in-memory store (data resets on restart). Set MONGODB_URI to persist.");
  return new MemoryStore();
}

const store = await createStore();
await seedBots(store);
if (store.kind === "memory") await seedDemoUser(store);

const botIds = new Set((await store.listUsers()).filter((u) => u.isBot).map((u) => u.id));
const server = http.createServer();
const realtime = createRealtime(server, config.clientOrigins, { alwaysOnline: () => [...botIds] });
const ai = createAIService(createProvider(config.ai));
const media = createMedia(config.cloudinary);
const replyAsBot = createBotReplier({ store, ai, realtime });

const ctx: AppContext = {
  store,
  ai,
  media,
  realtime,
  onMessage: (sender, receiver) => {
    if (botIds.has(receiver)) void replyAsBot(sender, receiver);
  },
};

server.on("request", createApp(ctx));
server.listen(config.port, () => {
  console.log(`QuickChat API on :${config.port}  [store=${store.kind} media=${media.kind} ai=${ai.providerName}]`);
  if (config.nodeEnv === "production" && config.jwtSecret === "dev-only-insecure-secret") {
    console.warn("⚠ JWT_SECRET is not set — set it before going live.");
  }
});
