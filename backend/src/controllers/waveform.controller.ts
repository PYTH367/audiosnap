// ────────────────────────────────────────────────────────────
// GET /api/waveform?url=...
// Downloads the source media (direct-URL sources only, same
// constraint as conversion) and returns a downsampled peak array so
// the frontend can render an accurate waveform without shipping the
// full audio file just to draw bars.
// ────────────────────────────────────────────────────────────
import { Request, Response } from "express";
import { unlink } from "fs/promises";
import { assertSafePublicUrl, detectPlatform } from "@/utils/urlValidator";
import { getExtractor } from "@/services/extractors/extractor.factory";
import { generateWaveformPeaks } from "@/services/ffmpeg.service";

export async function waveformController(req: Request, res: Response) {
  const { url } = req.query as { url: string };

  const parsed = assertSafePublicUrl(url);
  const platform = detectPlatform(parsed);
  const extractor = getExtractor(platform);

  const source = await extractor.fetchSourceMedia(url);
  try {
    const peaks = await generateWaveformPeaks(source.localPath);
    res.json({ peaks, durationSec: source.durationSec });
  } finally {
    // Waveform generation is a quick read — clean up immediately rather
    // than waiting on the standard TTL since no conversion will reuse it.
    await unlink(source.localPath).catch(() => undefined);
  }
}
