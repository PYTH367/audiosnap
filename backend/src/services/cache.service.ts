// ────────────────────────────────────────────────────────────
// Short-lived in-process cache for video metadata lookups. The same
// URL pasted twice in a short window (or shared between several users)
// shouldn't re-hit an oEmbed endpoint or re-run ffprobe. For a
// multi-instance deployment, swap NodeCache for a Redis-backed cache
// using the same key shape — the call sites won't change.
// ────────────────────────────────────────────────────────────
import NodeCache from "node-cache";
import { env } from "@/config/env";
import { VideoMetadataResult } from "@/services/extractors/extractor.interface";

const cache = new NodeCache({ stdTTL: env.METADATA_CACHE_TTL_SECONDS, checkperiod: 120 });

export function getCachedMetadata(url: string): VideoMetadataResult | undefined {
  return cache.get(url);
}

export function setCachedMetadata(url: string, metadata: VideoMetadataResult): void {
  cache.set(url, metadata);
}
