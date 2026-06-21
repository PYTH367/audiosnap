// ────────────────────────────────────────────────────────────
// Single seam that maps a detected SourcePlatform to a VideoExtractor
// implementation. Controllers call `getExtractor(platform)` and never
// import a concrete adapter directly — extend support by adding a
// case here (see README.md for the ground rules).
// ────────────────────────────────────────────────────────────
import { SourcePlatform } from "@prisma/client";
import { VideoExtractor } from "./extractor.interface";
import { DirectUrlExtractor } from "./directUrl.extractor";
import { OEmbedExtractor } from "./oembed.service";
import { UnsupportedSourceError } from "@/middleware/error.middleware";

const directUrlExtractor = new DirectUrlExtractor();

export function getExtractor(platform: SourcePlatform): VideoExtractor {
  switch (platform) {
    case SourcePlatform.DIRECT_URL:
      return directUrlExtractor;

    case SourcePlatform.YOUTUBE:
    case SourcePlatform.YOUTUBE_SHORTS:
    case SourcePlatform.TIKTOK:
    case SourcePlatform.TWITTER:
      return new OEmbedExtractor(platform);

    case SourcePlatform.INSTAGRAM:
    case SourcePlatform.FACEBOOK:
      // Meta's oEmbed for these requires an authenticated Graph API app
      // review process — there's no unauthenticated public endpoint to
      // call here, so we're upfront that it's unsupported rather than
      // silently failing later.
      throw new UnsupportedSourceError(
        "Instagram and Facebook previews require a Meta Graph API app token. " +
          "Add your own credentialed adapter in services/extractors to enable this — see README.md."
      );

    default:
      throw new UnsupportedSourceError(
        "This link isn't recognized as a supported video source. Try a direct video file URL."
      );
  }
}
