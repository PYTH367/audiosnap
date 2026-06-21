// ────────────────────────────────────────────────────────────
// Two limiters: a generous one for read endpoints (history, polling
// progress) and a stricter one for the expensive write endpoints
// (analyze/convert/trim) that spawn ffmpeg processes or hit external
// metadata providers.
// ────────────────────────────────────────────────────────────
import rateLimit from "express-rate-limit";
import { env } from "@/config/env";

const windowMs = env.RATE_LIMIT_WINDOW_MINUTES * 60 * 1000;

export const standardLimiter = rateLimit({
  windowMs,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down and try again shortly." },
});

export const heavyOperationLimiter = rateLimit({
  windowMs,
  max: Math.max(10, Math.floor(env.RATE_LIMIT_MAX_REQUESTS / 4)),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Conversion rate limit reached. Please wait before starting another job." },
});
