import type { NextFunction, Request, Response } from "express";
import type { AppContext } from "../context.js";
import { unauthorized } from "../errors.js";
import { verifyToken } from "../services/auth.js";
import type { StoredUser } from "../types.js";

declare module "express-serve-static-core" {
  interface Request {
    user?: StoredUser;
  }
}

export const requireAuth = (ctx: AppContext) => async (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) throw unauthorized("No token provided");
  const userId = verifyToken(header.slice(7), ctx.jwtSecret);
  if (!userId) throw unauthorized("Session expired, please sign in again");
  const user = await ctx.store.findUserById(userId);
  if (!user) throw unauthorized("Account no longer exists");
  req.user = user;
  next();
};
