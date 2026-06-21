// ────────────────────────────────────────────────────────────
// Every supported "source" (a direct media URL, a platform reachable
// via oEmbed, etc.) implements this interface. Controllers and services
// never talk to a specific platform directly — they go through
// `extractor.factory.ts`, which is the single seam you'd extend if you
// add a new source later. See README.md in this folder for the
// important caveat about which sources can actually be DOWNLOADED vs.
// only PREVIEWED.
// ────────────────────────────────────────────────────────────
import { SourcePlatform } from "@prisma/client";

export interface VideoMetadataResult {
  url: string;
  platform: SourcePlatform;
  title: string;
  author: string | null;
  thumbnail: string | null;
  durationSec: number;
}

export interface SourceMediaResult {
  /** Absolute path to the downloaded source file on local disk (tmp dir). */
  localPath: string;
  durationSec: number;
}

export interface VideoExtractor {
  readonly platform: SourcePlatform;

  /** Always supported — returns title/author/thumbnail/duration for the preview card. */
  fetchMetadata(url: string): Promise<VideoMetadataResult>;

  /**
   * Downloads the underlying media to local disk so FFmpeg can extract
   * audio from it. Throws `UnsupportedSourceError` for platforms where
   * this isn't implemented (see README.md) — those platforms still
   * support metadata preview via fetchMetadata().
   */
  fetchSourceMedia(url: string): Promise<SourceMediaResult>;
}
