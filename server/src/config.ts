import "dotenv/config";

const env = process.env;

export const config = {
  port: Number(env.PORT) || 5000,
  nodeEnv: env.NODE_ENV ?? "development",
  clientOrigins: (env.CLIENT_ORIGINS ?? "http://localhost:5173")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  // A dev fallback keeps the demo zero-config; production should always set this.
  jwtSecret: env.JWT_SECRET || "dev-only-insecure-secret",
  jwtExpiresIn: "7d" as const,
  mongoUri: env.MONGODB_URI || "",
  cloudinary: {
    cloudName: env.CLOUDINARY_CLOUD_NAME || "",
    apiKey: env.CLOUDINARY_API_KEY || "",
    apiSecret: env.CLOUDINARY_API_SECRET || "",
  },
  ai: {
    provider: (env.AI_PROVIDER || "auto").toLowerCase(),
    geminiKey: env.GEMINI_API_KEY || "",
    geminiModel: env.GEMINI_MODEL || "gemini-2.0-flash",
    groqKey: env.GROQ_API_KEY || "",
    groqModel: env.GROQ_MODEL || "llama-3.3-70b-versatile",
  },
};

export type Config = typeof config;
