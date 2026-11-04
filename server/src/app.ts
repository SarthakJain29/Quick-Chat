import cors from "cors";
import express, { type ErrorRequestHandler } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { ZodError } from "zod";
import { config } from "./config.js";
import type { AppContext } from "./context.js";
import { HttpError } from "./errors.js";
import { aiRoutes } from "./routes/ai.js";
import { authRoutes } from "./routes/auth.js";
import { messageRoutes } from "./routes/messages.js";

export function createApp(ctx: AppContext, opts: { origins?: string[]; rateLimit?: boolean } = {}) {
  const app = express();
  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(cors({ origin: opts.origins ?? config.clientOrigins, credentials: true }));
  app.use(express.json({ limit: "6mb" }));

  if (opts.rateLimit !== false) {
    // Brute-force guard on credentials; a looser cap on the (paid-for-by-quota) AI endpoints.
    app.use("/api/auth/login", rateLimit({ windowMs: 15 * 60_000, limit: 30, standardHeaders: true, legacyHeaders: false }));
    app.use("/api/ai", rateLimit({ windowMs: 60_000, limit: 40, standardHeaders: true, legacyHeaders: false }));
  }

  app.get("/api/health", (_req, res) =>
    res.json({ ok: true, store: ctx.store.kind, media: ctx.media.kind, ai: ctx.ai.providerName }),
  );
  app.use("/api/auth", authRoutes(ctx));
  app.use("/api/messages", messageRoutes(ctx));
  app.use("/api/ai", aiRoutes(ctx));

  app.use("/api", (_req, res) => res.status(404).json({ message: "Route not found" }));

  const onError: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err instanceof ZodError) {
      return void res.status(400).json({ message: err.issues[0]?.message ?? "Invalid input", issues: err.issues });
    }
    if (err instanceof HttpError) return void res.status(err.status).json({ message: err.message });
    if (err?.type === "entity.too.large") return void res.status(413).json({ message: "Payload too large" });
    console.error(err);
    res.status(500).json({ message: "Something went wrong on our side" });
  };
  app.use(onError);
  return app;
}
