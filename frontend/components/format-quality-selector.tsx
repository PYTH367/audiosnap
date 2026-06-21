"use client";

import { AudioFormat, Bitrate, SizeEstimate } from "@/lib/types";
import { cn, formatBytes } from "@/lib/utils";

const FORMATS: { value: AudioFormat; label: string; note: string }[] = [
  { value: "MP3", label: "MP3", note: "Universal" },
  { value: "WAV", label: "WAV", note: "Lossless" },
  { value: "M4A", label: "M4A", note: "Apple devices" },
  { value: "AAC", label: "AAC", note: "Efficient" },
];

const BITRATES: Bitrate[] = [128, 192, 256, 320];

interface FormatQualitySelectorProps {
  format: AudioFormat;
  bitrateKbps: Bitrate;
  onFormatChange: (format: AudioFormat) => void;
  onBitrateChange: (bitrate: Bitrate) => void;
  sizeEstimates: SizeEstimate[];
}

export function FormatQualitySelector({
  format,
  bitrateKbps,
  onFormatChange,
  onBitrateChange,
  sizeEstimates,
}: FormatQualitySelectorProps) {
  const isLossless = format === "WAV";
  const estimate = sizeEstimates.find((e) => e.bitrateKbps === bitrateKbps);

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-faint">Output format</p>
        <div className="grid grid-cols-4 gap-2">
          {FORMATS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => onFormatChange(f.value)}
              className={cn(
                "rounded-lg border px-3 py-2.5 text-left transition-all",
                format === f.value
                  ? "border-cyan/50 bg-cyan/10 text-ink"
                  : "border-glass-border bg-black/20 text-ink-muted hover:border-white/20"
              )}
            >
              <span className="block text-sm font-semibold">{f.label}</span>
              <span className="block text-[11px] text-ink-faint">{f.note}</span>
            </button>
          ))}
        </div>
      </div>

      <div className={cn("transition-opacity", isLossless && "pointer-events-none opacity-40")}>
        <p className="mb-2 flex items-center justify-between text-xs font-medium uppercase tracking-wide text-ink-faint">
          <span>Quality {isLossless && "(WAV is always lossless)"}</span>
        </p>
        <div className="grid grid-cols-4 gap-2">
          {BITRATES.map((b) => (
            <button
              key={b}
              type="button"
              disabled={isLossless}
              onClick={() => onBitrateChange(b)}
              className={cn(
                "rounded-lg border px-2 py-2 text-center text-sm font-mono transition-all",
                bitrateKbps === b && !isLossless
                  ? "border-cyan/50 bg-cyan/10 text-ink"
                  : "border-glass-border bg-black/20 text-ink-muted hover:border-white/20"
              )}
            >
              {b}k
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg bg-black/20 px-3 py-2.5">
        <span className="text-xs text-ink-muted">Estimated file size</span>
        <span className="font-mono text-sm text-ink">
          {isLossless ? "Varies (lossless)" : estimate ? formatBytes(estimate.estimatedBytes) : "—"}
        </span>
      </div>
    </div>
  );
}
