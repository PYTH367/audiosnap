// ────────────────────────────────────────────────────────────
// GET /api/download/:id
// Streams a completed conversion's output file. Cancels the scheduled
// cleanup deletion at request time so a slow client connection can't
// race a TTL-based delete, then re-schedules a short grace-period
// cleanup once the stream finishes.
// ────────────────────────────────────────────────────────────
import { Request, Response } from "express";
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import path from "path";
import { prisma } from "@/config/db";
import { NotFoundError, AppError } from "@/middleware/error.middleware";
import { cancelScheduledCleanup, scheduleCleanup } from "@/services/cleanup.service";

export async function downloadController(req: Request, res: Response) {
  const { id } = req.params;
  const conversion = await prisma.conversion.findUnique({ where: { id }, include: { video: true } });

  if (!conversion || conversion.clientId !== req.clientId) {
    throw new NotFoundError("Download not found.");
  }
  if (conversion.status !== "COMPLETED" || !conversion.outputPath) {
    throw new AppError("This conversion isn't ready to download yet.", 409);
  }

  const fileStats = await stat(conversion.outputPath).catch(() => null);
  if (!fileStats) {
    throw new NotFoundError("The converted file has expired and was cleaned up. Please re-convert.");
  }

  cancelScheduledCleanup(conversion.outputPath);

  const downloadName = `${conversion.video.title.replace(/[^\w\s-]/g, "")}.${conversion.format.toLowerCase()}`;
  res.setHeader("Content-Disposition", `attachment; filename="${downloadName}"`);
  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Content-Length", fileStats.size.toString());

  if (!conversion.actualBytes) {
    await prisma.conversion.update({ where: { id }, data: { actualBytes: fileStats.size } });
  }

  const stream = createReadStream(conversion.outputPath);
  stream.pipe(res);
  stream.on("close", () => scheduleCleanup(conversion.outputPath as string, 30));
}
