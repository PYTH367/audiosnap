// ────────────────────────────────────────────────────────────
// Thin, well-commented wrapper around fluent-ffmpeg. Every command is
// built to do exactly one thing efficiently:
//   - `-vn`            strip video entirely (we only want audio)
//   - codec per format  picked for quality/compatibility, not just "copy"
//   - `-ss` / `-t`      trim is done with stream-accurate seeking
// Progress events are forwarded via a callback so the controller can
// push them onto the job record for the frontend to poll.
// ────────────────────────────────────────────────────────────
import { mkdir } from "fs/promises";
import path from "path";
import { v4 as uuid } from "uuid";
import ffmpeg from "fluent-ffmpeg";
import { AudioFormat } from "@prisma/client";
import { env } from "@/config/env";
import { logger } from "@/utils/logger";

export interface ConversionOptions {
  inputPath: string;
  format: AudioFormat;
  bitrateKbps: number;
  /** Trim window in seconds — omit for a full-length export. */
  trimStartSec?: number;
  trimEndSec?: number;
  onProgress?: (percent: number) => void;
}

const CODEC_BY_FORMAT: Record<AudioFormat, { codec: string; extension: string }> = {
  MP3: { codec: "libmp3lame", extension: "mp3" },
  AAC: { codec: "aac", extension: "aac" },
  M4A: { codec: "aac", extension: "m4a" }, // AAC audio in an MP4/M4A container
  WAV: { codec: "pcm_s16le", extension: "wav" }, // lossless — bitrate option is ignored for WAV
};

export async function extractAudio(options: ConversionOptions): Promise<{ outputPath: string }> {
  const { inputPath, format, bitrateKbps, trimStartSec, trimEndSec, onProgress } = options;
  const { codec, extension } = CODEC_BY_FORMAT[format];

  await mkdir(env.TMP_DIR, { recursive: true });
  const outputPath = path.join(env.TMP_DIR, `${uuid()}-output.${extension}`);

  await new Promise<void>((resolve, reject) => {
    const command = ffmpeg(inputPath).noVideo(); // -vn, drop the video stream entirely

    // Seeking BEFORE specifying duration keeps ffmpeg's fast input-seek
    // path, which is far quicker than decoding from the start every time.
    if (typeof trimStartSec === "number" && trimStartSec > 0) {
      command.setStartTime(trimStartSec);
    }
    if (typeof trimStartSec === "number" && typeof trimEndSec === "number") {
      command.setDuration(Math.max(0, trimEndSec - trimStartSec));
    }

    command.audioCodec(codec);

    if (format !== "WAV") {
      command.audioBitrate(bitrateKbps);
    }

    command
      .on("progress", (progress) => {
        // fluent-ffmpeg's `percent` is only available when ffprobe can
        // determine total duration up front; clamp defensively.
        const percent = Math.min(100, Math.max(0, Math.round(progress.percent ?? 0)));
        onProgress?.(percent);
      })
      .on("error", (err) => {
        logger.error("FFmpeg conversion failed", { error: err.message, inputPath, format });
        reject(err);
      })
      .on("end", () => {
        onProgress?.(100);
        resolve();
      })
      .save(outputPath);
  });

  return { outputPath };
}

/**
 * Generates a downsampled waveform peak array from an audio/video file,
 * used to render the trimmer UI without shipping the full audio to the
 * browser just to draw bars. Returns ~600 normalized peaks (0–1).
 */
export async function generateWaveformPeaks(inputPath: string, sampleCount = 600): Promise<number[]> {
  return new Promise((resolve, reject) => {
    const peaks: number[] = [];
    let maxSeen = 0;

    ffmpeg(inputPath)
      .audioChannels(1)
      .audioFrequency(8000)
      .format("s16le")
      .on("error", reject)
      .pipe()
      .on("data", (chunk: Buffer) => {
        // Down-sample raw PCM into coarse peaks by taking the max
        // absolute sample value within fixed-size windows.
        for (let i = 0; i < chunk.length - 1; i += 2) {
          const sample = Math.abs(chunk.readInt16LE(i));
          maxSeen = Math.max(maxSeen, sample);
          peaks.push(sample);
        }
      })
      .on("end", () => {
        const bucketSize = Math.max(1, Math.floor(peaks.length / sampleCount));
        const downsampled: number[] = [];
        for (let i = 0; i < peaks.length; i += bucketSize) {
          const bucket = peaks.slice(i, i + bucketSize);
          const peak = Math.max(...bucket, 0);
          downsampled.push(maxSeen ? peak / maxSeen : 0);
        }
        resolve(downsampled.slice(0, sampleCount));
      });
  });
}
