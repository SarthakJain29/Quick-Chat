import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import type { AppContext } from "../context.js";
import { HttpError } from "../errors.js";
import { requireAuth } from "../middleware/auth.js";
import { signToken, toPublic } from "../services/auth.js";

const signupSchema = z.object({
  fullName: z.string().trim().min(1, "Name is required").max(60),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters").max(100),
  bio: z.string().trim().max(200).optional().default(""),
});
const loginSchema = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1) });
const profileSchema = z.object({
  fullName: z.string().trim().min(1).max(60).optional(),
  bio: z.string().trim().max(200).optional(),
  profilePic: z.string().optional(),
});

export function authRoutes(ctx: AppContext) {
  const r = Router();
  const session = (u: Parameters<typeof signToken>[0], user: Parameters<typeof toPublic>[0]) => ({
    token: signToken(u, ctx.jwtSecret),
    user: toPublic(user, { withEmail: true }),
  });

  r.post("/signup", async (req, res) => {
    const body = signupSchema.parse(req.body);
    if (await ctx.store.findUserByEmail(body.email)) throw new HttpError(409, "An account with this email already exists");
    const user = await ctx.store.createUser({
      email: body.email,
      fullName: body.fullName,
      bio: body.bio,
      passwordHash: await bcrypt.hash(body.password, 10),
    });
    res.status(201).json(session(user.id, user));
  });

  r.post("/login", async (req, res) => {
    const body = loginSchema.parse(req.body);
    const user = await ctx.store.findUserByEmail(body.email);
    // Same message for unknown email and wrong password: no account enumeration.
    const ok = user && !user.isBot && (await bcrypt.compare(body.password, user.passwordHash));
    if (!ok) throw new HttpError(401, "Invalid email or password");
    res.json(session(user.id, user));
  });

  r.get("/me", requireAuth(ctx), (req, res) => {
    res.json({ user: toPublic(req.user!, { withEmail: true }) });
  });

  r.put("/profile", requireAuth(ctx), async (req, res) => {
    const body = profileSchema.parse(req.body);
    const patch: { fullName?: string; bio?: string; profilePic?: string } = {};
    if (body.fullName !== undefined) patch.fullName = body.fullName;
    if (body.bio !== undefined) patch.bio = body.bio;
    if (body.profilePic) patch.profilePic = await ctx.media.upload(body.profilePic);
    const user = await ctx.store.updateUser(req.user!.id, patch);
    res.json({ user: toPublic(user!, { withEmail: true }) });
  });

  return r;
}
