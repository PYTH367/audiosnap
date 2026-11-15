// ────────────────────────────────────────────────────────────
// Loads and validates process.env once at boot so the rest of the
// app can import strongly-typed config instead of touching
// process.env directly all over the codebase.
// ────────────────────────────────────────────────────────────
import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(4000),
  CLIENT_ORIGIN: z.string().url(),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  REDIS_URL: z.string().url(),
  API_TOKEN_SECRET: z.string().min(32, "API_TOKEN_SECRET must be at least 32 characters"),
  TMP_DIR: z.string().default("./tmp"),
  TMP_FILE_TTL_MINUTES: z.coerce.number().default(60),
  RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().default(15),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
  MAX_VIDEO_DURATION_SECONDS: z.coerce.number().default(7200),
  MAX_SOURCE_SIZE_BYTES: z.coerce.number().int().positive().default(268435456),
  MAX_BATCH_URLS: z.coerce.number().default(10),
  METADATA_CACHE_TTL_SECONDS: z.coerce.number().default(1800),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Fail fast and loud — a misconfigured deployment should never boot.
  console.error("❌ Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
