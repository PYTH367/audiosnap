// ────────────────────────────────────────────────────────────
// Validates user-supplied URLs and classifies their source platform.
// Direct media downloads perform DNS validation and address pinning in
// publicMediaDownloader.ts before making any outbound connection.
// ────────────────────────────────────────────────────────────
import { SourcePlatform } from "@prisma/client";
import ipaddr from "ipaddr.js";

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

  if (parsed.port) {
    throw new InvalidUrlError("URLs using custom ports are not supported.");
  }

  if (parsed.username || parsed.password) {
    throw new InvalidUrlError("URLs containing embedded credentials are not allowed.");
  }

  const hostname = parsed.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    (ipaddr.isValid(hostname) && ipaddr.process(hostname).range() !== "unicast")
  ) {
    throw new InvalidUrlError("URLs pointing to internal/private addresses are not allowed.");
  }

  return parsed;
}

function isDomainOrSubdomain(hostname: string, domain: string): boolean {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

/**
 * Classifies a URL into a SourcePlatform purely from its hostname/path.
 * See `services/extractors/README.md` for platform support details.
 */
export function detectPlatform(url: URL): SourcePlatform {
  const host = url.hostname.replace(/^\[|\]$/g, "").replace(/^www\./, "").toLowerCase();

  if (host === "youtu.be" || isDomainOrSubdomain(host, "youtube.com")) {
    return url.pathname.startsWith("/shorts/") ? SourcePlatform.YOUTUBE_SHORTS : SourcePlatform.YOUTUBE;
  }
  if (isDomainOrSubdomain(host, "instagram.com")) return SourcePlatform.INSTAGRAM;
  if (isDomainOrSubdomain(host, "tiktok.com")) return SourcePlatform.TIKTOK;
  if (isDomainOrSubdomain(host, "facebook.com") || host === "fb.watch") return SourcePlatform.FACEBOOK;
  if (isDomainOrSubdomain(host, "twitter.com") || isDomainOrSubdomain(host, "x.com")) return SourcePlatform.TWITTER;

  const directExtensionPattern = /\.(mp4|mov|webm|mkv|m4v|avi)$/i;
  if (directExtensionPattern.test(url.pathname)) return SourcePlatform.DIRECT_URL;

  return SourcePlatform.OTHER;
}
