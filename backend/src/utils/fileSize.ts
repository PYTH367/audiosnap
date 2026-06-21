// ────────────────────────────────────────────────────────────
// Rough output-size estimate shown to the user BEFORE conversion runs,
// so they can decide if e.g. 320kbps is worth the extra MB. FFmpeg's
// actual output (stored as `actualBytes`) will differ slightly because
// of container overhead and VBR variance — this is intentionally a
// fast estimate, not a guarantee.
// ────────────────────────────────────────────────────────────

/** bytes = (bitrate in kbps * 1000 / 8) * duration in seconds, plus a small container overhead allowance. */
export function estimateAudioBytes(durationSec: number, bitrateKbps: number): number {
  const rawBytes = (bitrateKbps * 1000 / 8) * durationSec;
  const containerOverhead = 1.02; // ~2% for headers/metadata/frame padding
  return Math.round(rawBytes * containerOverhead);
}

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, exponent);
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[exponent]}`;
}
