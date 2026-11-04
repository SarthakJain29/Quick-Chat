import jwt from "jsonwebtoken";
import { config } from "../config.js";
import type { PublicUser, User } from "../types.js";

export const signToken = (userId: string, secret = config.jwtSecret) =>
  jwt.sign({ userId }, secret, { expiresIn: config.jwtExpiresIn });

export function verifyToken(token: string, secret = config.jwtSecret): string | null {
  try {
    const payload = jwt.verify(token, secret) as { userId?: string };
    return payload.userId ?? null;
  } catch {
    return null;
  }
}

/** Removes server-only fields before a user leaves the API. */
export function toPublic(u: User, opts: { withEmail?: boolean } = {}): PublicUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { persona, email, ...rest } = u as User & { passwordHash?: string };
  delete (rest as { passwordHash?: string }).passwordHash;
  return opts.withEmail ? { ...rest, email } : rest;
}
