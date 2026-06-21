# Extractors — read this before wiring up YouTube/TikTok/Instagram/etc.

This folder uses an adapter pattern (`VideoExtractor`) so AudioSnap can
support new sources without touching controllers, the queue, or the UI.
Two adapters ship today:

- **`directUrl.extractor.ts`** — full support (metadata + download +
  conversion) for any publicly accessible direct media URL (a CDN-hosted
  `.mp4`, a self-hosted file, an asset from a service where you have
  redistribution rights). Metadata comes from `ffprobe`; download is a
  plain HTTP fetch into `TMP_DIR`.
- **`oembed.service.ts`** — metadata-only preview (title, author,
  thumbnail) for YouTube, TikTok, and Twitter/X, using each platform's
  **official, public oEmbed endpoint** — the same mechanism they use to
  power link-preview cards. No scraping, no auth bypass.

## Why there's no YouTube/Instagram/TikTok/Facebook/Twitter *downloader* here

Pasting a link to one of those platforms in AudioSnap will show you a
metadata preview (it proves the URL resolves to a real video and tells
you what it is), but `fetchSourceMedia()` for those platforms throws an
`UnsupportedSourceError` instead of silently working. That's
intentional, not a missing feature:

- All five platforms' Terms of Service prohibit downloading video/audio
  through anything other than an explicit "Save"/"Download" control
  they provide themselves.
- A generic "paste any link, get an MP3" tool is exactly the pattern
  that's been the target of repeated copyright litigation against
  YouTube-to-MP3 services (e.g. the RIAA actions against youtube-mp3.org
  and similar sites), because in practice most traffic through such
  tools is ripping copyrighted music/video without a license.

## How to extend this safely for your own use case

If you have a legitimate reason to pull media from one of these
platforms — it's your own channel/account, you hold a license, or the
platform has issued you API access with download scope — implement a
new class against `VideoExtractor` in this folder (e.g.
`youtubeOfficialApi.extractor.ts`) using that platform's official API
and your own credentials, and register it in `extractor.factory.ts`.
Keep the legal/ToS check (ownership, license, or granted API scope) as
part of that adapter, not bypassed in the controller.

Do **not** add a general-purpose scraper (yt-dlp or similar) behind this
interface for arbitrary user-submitted URLs — that's the line between
"a tool I can deploy publicly" and "a tool that gets a DMCA takedown and
a cease-and-desist."
