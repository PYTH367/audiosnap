// ────────────────────────────────────────────────────────────
// Optional standalone entry point: run this as its own Railway service
// (separate from the HTTP API) when conversion volume is high enough
// that you want ffmpeg load isolated from the request-handling
// process. Both `npm run dev`/`npm start` (API + worker combined) and
// `npm run worker` (worker only) are valid deployment shapes — pick
// based on your traffic.
// ────────────────────────────────────────────────────────────
import { mkdir } from "fs/promises";
import { env } from "@/config/env";
import { startConversionWorker } from "@/services/queue.service";
import { startCleanupSweeper, sweepStaleTempFiles } from "@/services/cleanup.service";
import { logger } from "@/utils/logger";

async function main() {
  await mkdir(env.TMP_DIR, { recursive: true });
  await sweepStaleTempFiles();

  const worker = startConversionWorker();
  const cleanupInterval = startCleanupSweeper();
  logger.info("AudioSnap conversion worker started");

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down worker...`);
    clearInterval(cleanupInterval);
    await worker.close();
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((err) => {
  logger.error("Fatal worker startup error", { error: err instanceof Error ? err.stack : String(err) });
  process.exit(1);
});
