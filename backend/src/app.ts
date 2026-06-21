// ────────────────────────────────────────────────────────────
// Wires up the Express app: security headers, CORS, body parsing,
// request logging, the anonymous client-id resolver, all API routes,
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
import apiRoutes from "@/routes";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(morgan(env.NODE_ENV === "development" ? "dev" : "combined"));
  app.use(standardLimiter);

  // Health check — no client id required, used by Railway's healthcheck.
  app.get("/health", (_req, res) => res.json({ status: "ok", uptime: process.uptime() }));

  app.use("/api", asyncHandler(clientIdMiddleware), apiRoutes);

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}
