// ────────────────────────────────────────────────────────────
// Every conversion downloads a source video and writes an output audio
// file to TMP_DIR. Both are scratch space that must not accumulate —
// this service deletes them after a TTL and also sweeps the whole
// directory on a timer in case a process crash skipped a scheduled
// cleanup (e.g. server restart mid-job).
// ────────────────────────────────────────────────────────────
import { stat, unlink, readdir } from "fs/promises";
import path from "path";
import { env } from "@/config/env";
import { logger } from "@/utils/logger";

const pendingDeletions = new Map<string, NodeJS.Timeout>();

export function scheduleCleanup(filePath: string, delayMinutes = 5): void {
  const timeout = setTimeout(async () => {
    try {
      await unlink(filePath);
      logger.info("Cleaned up temp file", { filePath });
    } catch {
      // Already gone or never existed — not an error worth logging loudly.
    } finally {
      pendingDeletions.delete(filePath);
    }
  }, delayMinutes * 60 * 1000);

  pendingDeletions.set(filePath, timeout);
}

/** Cancels a scheduled deletion — call this right before streaming a file for download. */
export function cancelScheduledCleanup(filePath: string): void {
  const timeout = pendingDeletions.get(filePath);
  if (timeout) {
    clearTimeout(timeout);
    pendingDeletions.delete(filePath);
  }
}

/** Periodic sweep that catches orphaned files from crashed/restarted processes. */
export async function sweepStaleTempFiles(): Promise<void> {
  try {
    const files = await readdir(env.TMP_DIR);
    const ttlMs = env.TMP_FILE_TTL_MINUTES * 60 * 1000;
    const now = Date.now();

    await Promise.all(
      files.map(async (file) => {
        const fullPath = path.join(env.TMP_DIR, file);
        const stats = await stat(fullPath).catch(() => null);
        if (stats && now - stats.mtimeMs > ttlMs) {
          await unlink(fullPath).catch(() => undefined);
        }
      })
    );
  } catch {
    // TMP_DIR may not exist yet on a fresh deploy — nothing to sweep.
  }
}

export function startCleanupSweeper(intervalMinutes = 15): NodeJS.Timeout {
  return setInterval(sweepStaleTempFiles, intervalMinutes * 60 * 1000);
}
