// ────────────────────────────────────────────────────────────
// Metadata-ONLY adapter for platforms that publish an official oEmbed
// endpoint. oEmbed is the same public, unauthenticated mechanism these
// platforms use to render link-preview cards in Slack/Discord/etc., so
// using it for a preview card here doesn't touch their ToS. It does
// NOT provide a way to download the underlying video/audio — see
// extractor.factory.ts and README.md for why fetchSourceMedia() is
// intentionally not implemented for these.
// ────────────────────────────────────────────────────────────
import { SourcePlatform } from "@prisma/client";
import { VideoExtractor, VideoMetadataResult, SourceMediaResult } from "./extractor.interface";
import { UnsupportedSourceError } from "@/middleware/error.middleware";

interface OEmbedResponse {
  title?: string;
  author_name?: string;
  thumbnail_url?: string;
}

const OEMBED_ENDPOINTS: Record<string, (url: string) => string> = {
  [SourcePlatform.YOUTUBE]: (url) => `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
  [SourcePlatform.YOUTUBE_SHORTS]: (url) => `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
  [SourcePlatform.TIKTOK]: (url) => `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`,
  [SourcePlatform.TWITTER]: (url) => `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}`,
};

export class OEmbedExtractor implements VideoExtractor {
  constructor(readonly platform: SourcePlatform) {}

  async fetchMetadata(url: string): Promise<VideoMetadataResult> {
    const buildEndpoint = OEMBED_ENDPOINTS[this.platform];
    if (!buildEndpoint) {
      throw new UnsupportedSourceError(`No oEmbed provider configured for ${this.platform}.`);
    }

    const res = await fetch(buildEndpoint(url));
    if (!res.ok) {
      throw new UnsupportedSourceError(
        "Couldn't fetch a preview for this link. It may be private, deleted, or region-restricted."
      );
    }

    const data = (await res.json()) as OEmbedResponse;

    return {
      url,
      platform: this.platform,
      title: data.title ?? "Untitled video",
      author: data.author_name ?? null,
      thumbnail: data.thumbnail_url ?? null,
      // oEmbed doesn't return duration for these providers; the UI marks
      // this as "duration unknown until conversion" for platforms without it.
      durationSec: 0,
    };
  }

  async fetchSourceMedia(_url: string): Promise<SourceMediaResult> {
    throw new UnsupportedSourceError(
      `Downloading from ${this.platform} isn't supported. AudioSnap only converts direct, ` +
        "publicly hosted media URLs or content you have the rights to redistribute — see " +
        "services/extractors/README.md for why, and how to add an authorized adapter for your own use case."
    );
  }
}
