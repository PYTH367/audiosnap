// ────────────────────────────────────────────────────────────
// Handles any publicly accessible, direct media URL (CDN links,
// self-hosted files, anything ending in a recognized video extension
// or serving a video content-type). This is the one extractor that
// supports the full pipeline: metadata + download + conversion.
// ────────────────────────────────────────────────────────────
import { mkdir, unlink } from "fs/promises";
import path from "path";
import { v4 as uuid } from "uuid";
import ffmpeg from "fluent-ffmpeg";
import { SourcePlatform } from "@prisma/client";
import { env } from "@/config/env";
import { VideoExtractor, VideoMetadataResult, SourceMediaResult } from "./extractor.interface";
import { UnsupportedSourceError } from "@/middleware/error.middleware";
import { assertSafePublicUrl } from "@/utils/urlValidator";
import { downloadPublicMedia } from "./publicMediaDownloader";

function probeDuration(filePathOrUrl: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePathOrUrl, (err, data) => {
      if (err) return reject(err);
      const duration = data.format.duration;
      if (typeof duration !== "number" || !Number.isFinite(duration) || duration <= 0) {
        return reject(new UnsupportedSourceError("Could not determine a valid video duration."));
      }
      if (duration > env.MAX_VIDEO_DURATION_SECONDS) {
        return reject(
          new UnsupportedSourceError(
            `Videos must be ${env.MAX_VIDEO_DURATION_SECONDS} seconds or shorter.`
          )
        );
      }
      resolve(Math.max(1, Math.round(duration)));
    });
  });
}

export class DirectUrlExtractor implements VideoExtractor {
  readonly platform = SourcePlatform.DIRECT_URL;

  async fetchMetadata(url: string): Promise<VideoMetadataResult> {
    const source = await this.fetchSourceMedia(url);
    try {
      const fileName = decodeURIComponent(path.basename(new URL(url).pathname)) || "video";
      return {
        url,
        platform: this.platform,
        title: fileName.replace(/\.[^/.]+$/, ""),
        author: null,
        thumbnail: null,
        durationSec: source.durationSec,
      };
    } finally {
      await unlink(source.localPath).catch(() => undefined);
    }
  }

  async fetchSourceMedia(url: string): Promise<SourceMediaResult> {
    await mkdir(env.TMP_DIR, { recursive: true });
    const parsedUrl = assertSafePublicUrl(url);
    const localPath = path.join(env.TMP_DIR, `${uuid()}-source${path.extname(parsedUrl.pathname) || ".mp4"}`);

    try {
      await downloadPublicMedia(parsedUrl, localPath);

      const durationSec = await probeDuration(localPath);
      return { localPath, durationSec };
    } catch (error) {
      await unlink(localPath).catch(() => undefined);
      throw error;
    }
  }
}
