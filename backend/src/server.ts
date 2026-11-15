// ────────────────────────────────────────────────────────────
// Entry point. Boots the Express server AND the BullMQ conversion
// worker in the same process for simplicity. For higher-throughput
// production deployments, run `npm run worker` (see package.json) as
// a separate Railway service so a burst of conversions can't starve
// the HTTP server's event loop.
// ────────────────────────────────────────────────────────────
// Must be the first import — configures fluent-ffmpeg's binary paths
// before any other module (queue/ffmpeg services) touches it.
import "@/config/ffmpegBinary";

import { mkdir } from "fs/promises";
import { env } from "@/config/env";
import { createApp } from "@/app";
import { startConversionWorker } from "@/services/queue.service";
import { startCleanupSweeper, sweepStaleTempFiles } from "@/services/cleanup.service";
import { logger } from "@/utils/logger";

async function main() {
  await mkdir(env.TMP_DIR, { recursive: true });
  await sweepStaleTempFiles(); // clear anything orphaned by a previous crash

  const app = createApp();
  const worker = startConversionWorker();
  const cleanupInterval = startCleanupSweeper();

  const server = app.listen(env.PORT, () => {
    logger.info(`AudioSnap API listening on port ${env.PORT}`, { env: env.NODE_ENV });
  });

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    clearInterval(cleanupInterval);
    await worker.close();
    server.close(() => process.exit(0));
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((err) => {
  logger.error("Fatal startup error", { error: err instanceof Error ? err.stack : String(err) });
  process.exit(1);
});
