// ────────────────────────────────────────────────────────────
// Queue-based processing: conversion and trim requests are pushed onto
// a Redis-backed BullMQ queue instead of running inline in the request
// handler. This keeps the API responsive (it returns a job id
// immediately) and lets us cap concurrency so a burst of requests
// doesn't spawn dozens of simultaneous ffmpeg processes.
// ────────────────────────────────────────────────────────────
import { Queue, Worker, Job } from "bullmq";
import { env } from "@/config/env";
import { logger } from "@/utils/logger";
import { prisma } from "@/config/db";
import { extractAudio } from "@/services/ffmpeg.service";
import { getExtractor } from "@/services/extractors/extractor.factory";
import { scheduleCleanup } from "@/services/cleanup.service";

export interface ConversionJobData {
  conversionId: string;
  sourceUrl: string;
  platform: import("@prisma/client").SourcePlatform;
  format: import("@prisma/client").AudioFormat;
  bitrateKbps: number;
  trimStartSec?: number;
  trimEndSec?: number;
}

// Pass connection options directly rather than instantiating our own
// IORedis client. BullMQ bundles its own ioredis internally — handing
// it a separately-constructed `ioredis` instance (from our own
// dependency) trips a structural type mismatch between the two
// packages' internal types even though they're functionally
// compatible at runtime. A plain options object sidesteps that.
const connection = { url: env.REDIS_URL, maxRetriesPerRequest: null as null };

export const conversionQueue = new Queue<ConversionJobData>("audio-conversion", { connection });

// Concurrency of 2 keeps CPU/ffmpeg load predictable on a single small
// Railway instance; bump this (and your dyno size) as load grows.
export function startConversionWorker() {
  const worker = new Worker<ConversionJobData>(
    "audio-conversion",
    async (job: Job<ConversionJobData>) => {
      const { conversionId, sourceUrl, platform, format, bitrateKbps, trimStartSec, trimEndSec } = job.data;

      await prisma.conversion.update({
        where: { id: conversionId },
        data: { status: "CONVERTING", progress: 0 },
      });

      const extractor = getExtractor(platform);
      const source = await extractor.fetchSourceMedia(sourceUrl);

      const { outputPath } = await extractAudio({
        inputPath: source.localPath,
        format,
        bitrateKbps,
        trimStartSec,
        trimEndSec,
        onProgress: async (percent) => {
          await job.updateProgress(percent);
          await prisma.conversion.update({ where: { id: conversionId }, data: { progress: percent } });
        },
      });

      await prisma.conversion.update({
        where: { id: conversionId },
        data: {
          status: "COMPLETED",
          progress: 100,
          outputPath,
          downloadUrl: `/api/download/${conversionId}`,
          completedAt: new Date(),
        },
      });

      // Source + output files are scratch space — schedule their deletion
      // for after the TTL window instead of leaking disk over time.
      scheduleCleanup(source.localPath);
      scheduleCleanup(outputPath, env.TMP_FILE_TTL_MINUTES);

      return { outputPath };
    },
    { connection, concurrency: 2 }
  );

  worker.on("failed", async (job, err) => {
    logger.error("Conversion job failed", { jobId: job?.id, error: err.message });
    if (job) {
      await prisma.conversion.update({
        where: { id: job.data.conversionId },
        data: { status: "FAILED", errorMessage: err.message },
      });
    }
  });

  return worker;
}
