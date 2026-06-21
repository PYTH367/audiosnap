// ────────────────────────────────────────────────────────────
// Zod schemas double as runtime validation (via validate.middleware)
// and compile-time types (via z.infer) — single source of truth for
// each endpoint's request shape.
// ────────────────────────────────────────────────────────────
import { z } from "zod";

export const analyzeSchema = z.object({
  url: z.string().url(),
});

export const batchAnalyzeSchema = z.object({
  urls: z.array(z.string().url()).min(1).max(10),
});

export const audioFormatEnum = z.enum(["MP3", "WAV", "M4A", "AAC"]);
export const bitrateEnum = z.coerce.number().refine((v) => [128, 192, 256, 320].includes(v), {
  message: "Bitrate must be one of 128, 192, 256, or 320 kbps",
});

export const convertSchema = z.object({
  url: z.string().url(),
  format: audioFormatEnum,
  bitrateKbps: bitrateEnum.default(192),
});

export const trimSchema = convertSchema.extend({
  trimStartSec: z.coerce.number().min(0),
  trimEndSec: z.coerce.number().positive(),
}).refine((data) => data.trimEndSec > data.trimStartSec, {
  message: "trimEndSec must be greater than trimStartSec",
  path: ["trimEndSec"],
});

export const historyQuerySchema = z.object({
  search: z.string().optional(),
});

export const idParamSchema = z.object({
  id: z.string().uuid(),
});

export type ConvertInput = z.infer<typeof convertSchema>;
export type TrimInput = z.infer<typeof trimSchema>;
