// ────────────────────────────────────────────────────────────
// Verify the short-lived API token issued after GitHub sign-in, then
// scope history to that stable GitHub account id.
// ────────────────────────────────────────────────────────────
import { NextFunction, Request, Response } from "express";
import { jwtVerify } from "jose";
import { prisma } from "@/config/db";
import { env } from "@/config/env";
import { AppError } from "./error.middleware";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      clientId?: string;
    }
  }
}

export async function clientIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const authorization = req.header("Authorization");
  const match = authorization?.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    throw new AppError("Sign in with GitHub to access this resource.", 401);
  }

  let subject: string;
  try {
    const { payload } = await jwtVerify(match[1], new TextEncoder().encode(env.API_TOKEN_SECRET), {
      issuer: "audiosnap",
      audience: "audiosnap-api",
    });
    if (!payload.sub) throw new Error("Missing token subject");
    subject = payload.sub;
  } catch {
    throw new AppError("Your sign-in has expired. Please sign in again.", 401);
  }

  const headerId = `github:${subject}`;
  await prisma.client.upsert({
    where: { id: headerId },
    create: { id: headerId },
    update: {},
  });

  req.clientId = headerId;
  next();
}
