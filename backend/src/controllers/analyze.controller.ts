// ────────────────────────────────────────────────────────────
// POST /api/analyze
// Resolves a pasted URL into preview metadata (title/thumbnail/
// duration/author) plus a per-format size estimate, without starting
// any conversion. Cached so repeated pastes of the same URL are cheap.
// ────────────────────────────────────────────────────────────
import { Request, Response } from "express";
import { prisma } from "@/config/db";
import { assertSafePublicUrl, detectPlatform } from "@/utils/urlValidator";
import { getExtractor } from "@/services/extractors/extractor.factory";
import { getCachedMetadata, setCachedMetadata } from "@/services/cache.service";
import { estimateAudioBytes, formatBytes } from "@/utils/fileSize";
import { recordSearch } from "@/services/history.service";
import { SourcePlatform } from "@prisma/client";

const BITRATES = [128, 192, 256, 320];

async function analyzeOne(url: string) {
  const cached = getCachedMetadata(url);
  if (cached) return cached;

  const parsed = assertSafePublicUrl(url);
  const platform = detectPlatform(parsed);
  const extractor = getExtractor(platform);
  const metadata = await extractor.fetchMetadata(url);

  setCachedMetadata(url, metadata);

  // Upsert so repeated analyses of the same URL update freshness
  // instead of accumulating duplicate rows.
  await prisma.videoMetadata.upsert({
    where: { url },
    create: {
      url,
      platform: metadata.platform,
      title: metadata.title,
      author: metadata.author,
      thumbnail: metadata.thumbnail,
      durationSec: metadata.durationSec,
    },
    update: {
      title: metadata.title,
      author: metadata.author,
      thumbnail: metadata.thumbnail,
      durationSec: metadata.durationSec,
    },
  });

  return metadata;
}

export async function analyzeController(req: Request, res: Response) {
  const { url } = req.body as { url: string };

  if (req.clientId) await recordSearch(req.clientId, url);

  const metadata = await analyzeOne(url);

  const sizeEstimates = BITRATES.map((bitrateKbps) => ({
    bitrateKbps,
    estimatedBytes: estimateAudioBytes(metadata.durationSec, bitrateKbps),
    estimatedSizeLabel: formatBytes(estimateAudioBytes(metadata.durationSec, bitrateKbps)),
  }));

  res.json({
    ...metadata,
    canDownload: metadata.platform === SourcePlatform.DIRECT_URL,
    sizeEstimates,
  });
}

export async function batchAnalyzeController(req: Request, res: Response) {
  const { urls } = req.body as { urls: string[] };

  const results = await Promise.allSettled(urls.map((url) => analyzeOne(url)));

  res.json({
    results: results.map((result, i) => {
      if (result.status === "fulfilled") {
        const metadata = result.value;
        return {
          url: urls[i],
          success: true,
          metadata: { ...metadata, canDownload: metadata.platform === SourcePlatform.DIRECT_URL },
        };
      }
      return { url: urls[i], success: false, error: (result.reason as Error).message };
    }),
  });
}
