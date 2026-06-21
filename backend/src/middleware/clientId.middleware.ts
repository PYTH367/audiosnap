// ────────────────────────────────────────────────────────────
// AudioSnap has no login flow — history/favorites are scoped to an
// anonymous client id the frontend generates once and stores in
// localStorage, sent back as "X-Client-Id" on every request. This
// middleware upserts the Client row and attaches it to req so
// controllers never touch Prisma's Client model directly.
// ────────────────────────────────────────────────────────────
import { NextFunction, Request, Response } from "express";
import { prisma } from "@/config/db";
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
  const headerId = req.header("X-Client-Id");

  if (!headerId || headerId.length < 10) {
    throw new AppError("Missing or invalid X-Client-Id header.", 400);
  }

  await prisma.client.upsert({
    where: { id: headerId },
    create: { id: headerId },
    update: {},
  });

  req.clientId = headerId;
  next();
}
