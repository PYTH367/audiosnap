// ────────────────────────────────────────────────────────────
// POST /api/convert       — full-length audio export
// GET  /api/convert/:id   — poll job status/progress (frontend uses
//                           this for the animated progress bar)
// ────────────────────────────────────────────────────────────
import { Request, Response } from "express";
import { prisma } from "@/config/db";
import { assertSafePublicUrl, detectPlatform } from "@/utils/urlValidator";
import { getExtractor } from "@/services/extractors/extractor.factory";
import { conversionQueue } from "@/services/queue.service";
import { estimateAudioBytes } from "@/utils/fileSize";
import { NotFoundError } from "@/middleware/error.middleware";
import { ConvertInput, TrimInput } from "@/types";

/**
 * Shared by both /api/convert and /api/trim — looks up (or creates)
 * the cached VideoMetadata row, creates a Conversion record in
 * PENDING state, and enqueues the actual ffmpeg work. Returns the
 * Conversion row so the controller can shape the HTTP response.
 */
export async function createConversionJob(
  clientId: string,
  input: ConvertInput | TrimInput
) {
  const parsed = assertSafePublicUrl(input.url);
  const platform = detectPlatform(parsed);

  // Will throw UnsupportedSourceError early (before creating any DB row)
  // for platforms that don't support fetchSourceMedia — fail fast.
  getExtractor(platform);

  const video = await prisma.videoMetadata.findUnique({ where: { url: input.url } });
  if (!video) {
    throw new NotFoundError("Run /api/analyze for this URL first so duration/title are known.");
  }

  const trim = "trimStartSec" in input ? input : null;
  const effectiveDuration = trim ? trim.trimEndSec - trim.trimStartSec : video.durationSec;

  const conversion = await prisma.conversion.create({
    data: {
      clientId,
      videoMetadataId: video.id,
      format: input.format,
      bitrateKbps: input.bitrateKbps,
      trimStartSec: trim?.trimStartSec,
      trimEndSec: trim?.trimEndSec,
      estimatedBytes: estimateAudioBytes(effectiveDuration, input.bitrateKbps),
      status: "PENDING",
    },
  });

  await conversionQueue.add("convert", {
    conversionId: conversion.id,
    sourceUrl: input.url,
    platform,
    format: input.format,
    bitrateKbps: input.bitrateKbps,
    trimStartSec: trim?.trimStartSec,
    trimEndSec: trim?.trimEndSec,
  });

  return conversion;
}

export async function convertController(req: Request, res: Response) {
  const conversion = await createConversionJob(req.clientId!, req.body as ConvertInput);
  res.status(202).json({
    conversionId: conversion.id,
    status: conversion.status,
    estimatedBytes: conversion.estimatedBytes,
  });
}

export async function getConversionStatusController(req: Request, res: Response) {
  const { id } = req.params;
  const conversion = await prisma.conversion.findUnique({ where: { id }, include: { video: true } });
  if (!conversion || conversion.clientId !== req.clientId) {
    throw new NotFoundError("Conversion job not found.");
  }
  res.json(conversion);
}
