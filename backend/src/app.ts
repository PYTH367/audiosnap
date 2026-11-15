// ────────────────────────────────────────────────────────────
// Wires up the Express app: security headers, CORS, body parsing,
// request logging, the signed-in client resolver, all API routes,
// and finally the 404 + error handlers (order matters — error
// middleware must be registered last).
// ────────────────────────────────────────────────────────────
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "@/config/env";
import { standardLimiter } from "@/middleware/rateLimit.middleware";
import { clientIdMiddleware } from "@/middleware/clientId.middleware";
import { errorMiddleware, notFoundMiddleware } from "@/middleware/error.middleware";
import { asyncHandler } from "@/utils/asyncHandler";
import { prisma } from "@/config/db";
import { conversionQueue } from "@/services/queue.service";
import apiRoutes from "@/routes";

export function createApp() {
  const app = express();

  if (env.NODE_ENV === "production") app.set("trust proxy", 1);
  app.use(helmet());
  app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(morgan(env.NODE_ENV === "development" ? "dev" : "combined"));
  app.use(standardLimiter);

  // Readiness check — no client id required; verify database and Redis before reporting healthy.
  app.get(
    "/health",
    asyncHandler(async (_req, res) => {
      await prisma.$queryRaw`SELECT 1`;
      await conversionQueue.waitUntilReady();
      res.json({ status: "ok", uptime: process.uptime() });
    })
  );

  app.use("/api", asyncHandler(clientIdMiddleware), apiRoutes);

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}
