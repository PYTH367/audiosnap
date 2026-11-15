// ────────────────────────────────────────────────────────────
// Handles any publicly accessible, direct media URL (CDN links,
// self-hosted files, anything ending in a recognized video extension
// or serving a video content-type). This is the one extractor that
// supports the full pipeline: metadata + download + conversion.
// ────────────────────────────────────────────────────────────
import { createWriteStream } from "fs";
import { mkdir, unlink } from "fs/promises";
import path from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { v4 as uuid } from "uuid";
import ffmpeg from "fluent-ffmpeg";
import { SourcePlatform } from "@prisma/client";
import { env } from "@/config/env";
import { VideoExtractor, VideoMetadataResult, SourceMediaResult } from "./extractor.interface";
import { UnsupportedSourceError } from "@/middleware/error.middleware";

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
    // ffprobe can read duration directly from a remote URL via HTTP range
    // requests without downloading the whole file first.
    const durationSec = await probeDuration(url);
    const fileName = decodeURIComponent(path.basename(new URL(url).pathname)) || "video";

    return {
      url,
      platform: this.platform,
      title: fileName.replace(/\.[^/.]+$/, ""),
      author: null,
      thumbnail: null, // generic file hosts don't expose a thumbnail; the UI shows a waveform placeholder instead
      durationSec,
    };
  }

  async fetchSourceMedia(url: string): Promise<SourceMediaResult> {
    await mkdir(env.TMP_DIR, { recursive: true });
    const localPath = path.join(env.TMP_DIR, `${uuid()}-source${path.extname(new URL(url).pathname) || ".mp4"}`);

    try {
      const response = await fetch(url);
      if (!response.ok || !response.body) {
        throw new UnsupportedSourceError(`Could not fetch the video (HTTP ${response.status}).`);
      }

      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.startsWith("video/") && !contentType.startsWith("application/octet-stream")) {
        throw new UnsupportedSourceError(
          "That URL doesn't appear to point directly at a video file. Direct links must serve video content."
        );
      }

      // Node's fetch returns a web ReadableStream; pipe it to disk.
      const nodeStream = Readable.fromWeb(response.body);
      await pipeline(nodeStream, createWriteStream(localPath));

      const durationSec = await probeDuration(localPath);
      return { localPath, durationSec };
    } catch (error) {
      await unlink(localPath).catch(() => undefined);
      throw error;
    }
  }
}
