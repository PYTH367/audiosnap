// ────────────────────────────────────────────────────────────
// Single shared Prisma client instance. In dev, Next/tsx hot-reload
// can spawn duplicate clients and exhaust Postgres connections, so we
// cache the instance on the global object (standard Prisma pattern).
// ────────────────────────────────────────────────────────────
import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
