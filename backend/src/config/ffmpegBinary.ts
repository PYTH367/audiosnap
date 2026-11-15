// ────────────────────────────────────────────────────────────
// Points fluent-ffmpeg at the ffmpeg/ffprobe binaries shipped by the
// @ffmpeg-installer and @ffprobe-installer npm packages, instead of
// expecting `ffmpeg`/`ffprobe` to already be on the host's PATH.
//
// Why: many free hosting platforms (Render's native Node runtime,
// Vercel, etc.) don't let you apt-get install system packages without
// writing a Dockerfile. These installer packages download a
// platform-matched static binary during `npm install`, so FFmpeg
// "just works" anywhere Node runs — no Dockerfile, no nixpacks.toml,
// no system package manager required.
//
// This file has side effects only — import it once, before any other
// module uses fluent-ffmpeg, in every process entry point (server.ts
// and jobs/conversion.worker.ts).
// ────────────────────────────────────────────────────────────
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import ffprobeInstaller from "@ffprobe-installer/ffprobe";

ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);
