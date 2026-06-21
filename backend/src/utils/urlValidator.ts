// ────────────────────────────────────────────────────────────
// Validates that an incoming URL is well-formed, uses http(s), and
// doesn't point at internal/private infrastructure (basic SSRF guard —
// the backend is about to make an outbound request to whatever URL the
// user pastes, so this matters). Also classifies which platform a URL
// belongs to, which downstream services use to pick an extractor and
// to label history rows.
// ────────────────────────────────────────────────────────────
import { SourcePlatform } from "@prisma/client";

const PRIVATE_HOSTNAME_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./, // link-local / cloud metadata endpoints (e.g. 169.254.169.254)
  /^0\.0\.0\.0$/,
  /^\[?::1\]?$/,
];

export class InvalidUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidUrlError";
  }
}

export function assertSafePublicUrl(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new InvalidUrlError("That doesn't look like a valid URL.");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new InvalidUrlError("Only http(s) URLs are supported.");
  }

  if (PRIVATE_HOSTNAME_PATTERNS.some((pattern) => pattern.test(parsed.hostname))) {
    throw new InvalidUrlError("URLs pointing to internal/private addresses are not allowed.");
  }

  return parsed;
}

/**
 * Classifies a URL into a SourcePlatform purely from its hostname/path —
 * used for labeling and for routing to the right metadata strategy.
 * See `services/extractors/README.md` for what each platform actually
 * supports today (most platform downloads are intentionally NOT
 * implemented — see that doc for why).
 */
export function detectPlatform(url: URL): SourcePlatform {
  const host = url.hostname.replace(/^www\./, "").toLowerCase();

  if (host === "youtu.be" || host.endsWith("youtube.com")) {
    return url.pathname.startsWith("/shorts/") ? SourcePlatform.YOUTUBE_SHORTS : SourcePlatform.YOUTUBE;
  }
  if (host.endsWith("instagram.com")) return SourcePlatform.INSTAGRAM;
  if (host.endsWith("tiktok.com")) return SourcePlatform.TIKTOK;
  if (host.endsWith("facebook.com") || host === "fb.watch") return SourcePlatform.FACEBOOK;
  if (host.endsWith("twitter.com") || host.endsWith("x.com")) return SourcePlatform.TWITTER;

  // Direct media links (CDN-hosted .mp4/.mov/.webm/etc.) or anything else
  // publicly fetchable get handled generically by ffprobe/ffmpeg.
  const directExtensionPattern = /\.(mp4|mov|webm|mkv|m4v|avi)(\?.*)?$/i;
  if (directExtensionPattern.test(url.pathname)) return SourcePlatform.DIRECT_URL;

  return SourcePlatform.OTHER;
}
