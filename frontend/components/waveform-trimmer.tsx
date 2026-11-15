"use client";

import { useEffect, useRef, useState, useCallback, PointerEvent as ReactPointerEvent } from "react";
import { Play, Pause, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import { formatDuration, cn } from "@/lib/utils";
import { pushToast } from "@/hooks/use-toast";

interface WaveformTrimmerProps {
  /** The original media URL — used as the <audio> preview source AND to fetch waveform peaks. Only called for direct, playable sources. */
  sourceUrl: string;
  durationSec: number;
  onTrimChange: (start: number, end: number) => void;
}

export function WaveformTrimmer({ sourceUrl, durationSec, onTrimChange }: WaveformTrimmerProps) {
  const [peaks, setPeaks] = useState<number[] | null>(null);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(durationSec);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playheadPct, setPlayheadPct] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const draggingHandle = useRef<"start" | "end" | null>(null);

  useEffect(() => {
    api
      .getWaveform(sourceUrl)
      .then((res) => setPeaks(res.peaks))
      .catch(() =>
        pushToast({ title: "Couldn't load waveform", description: "Showing a flat preview instead.", variant: "error" })
      );
  }, [sourceUrl]);

  useEffect(() => {
    onTrimChange(start, end);
  }, [start, end, onTrimChange]);

  const pctFromClientX = useCallback((clientX: number) => {
    const track = trackRef.current;
    if (!track) return 0;
    const rect = track.getBoundingClientRect();
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  }, []);

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!draggingHandle.current) return;
    const pct = pctFromClientX(e.clientX);
    const seconds = pct * durationSec;

    if (draggingHandle.current === "start") {
      setStart(Math.min(seconds, end - 0.5));
    } else {
      setEnd(Math.max(seconds, start + 0.5));
    }
  }

  function handlePointerUp() {
    draggingHandle.current = null;
  }

  function startDrag(handle: "start" | "end", e: ReactPointerEvent) {
    e.preventDefault();
    draggingHandle.current = handle;
    e.currentTarget.parentElement?.setPointerCapture(e.pointerId);
  }

  function togglePreview() {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    audio.currentTime = start;
    audio.play().catch(() => {
      setIsPlaying(false);
      pushToast({
        title: "Preview unavailable",
        description: "This source can't be streamed directly in-browser.",
        variant: "error",
      });
    });
    setIsPlaying(true);
  }

  function handleTimeUpdate() {
    const audio = audioRef.current;
    if (!audio) return;
    setPlayheadPct(((audio.currentTime - 0) / durationSec) * 100);
    if (audio.currentTime >= end) {
      audio.pause();
      setIsPlaying(false);
    }
  }

  const startPct = (start / durationSec) * 100;
  const endPct = (end / durationSec) * 100;

  return (
    <div className="glass-panel space-y-3 p-4">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ink-faint">
          <Scissors className="h-3.5 w-3.5" /> Trim selection
        </p>
        <span className="font-mono text-xs text-cyan">
          {formatDuration(start)} – {formatDuration(end)} · {formatDuration(end - start)} selected
        </span>
      </div>

      {!peaks ? (
        <Skeleton className="h-20 w-full" />
      ) : (
        <div
          ref={trackRef}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="relative h-20 w-full select-none overflow-hidden rounded-lg bg-black/30"
        >
          {/* Waveform bars */}
          <div className="absolute inset-0 flex items-center gap-px px-1">
            {peaks.map((peak, i) => {
              const barPct = (i / peaks.length) * 100;
              const inSelection = barPct >= startPct && barPct <= endPct;
              return (
                <div
                  key={i}
                  className={cn("flex-1 rounded-full", inSelection ? "bg-cyan" : "bg-white/15")}
                  style={{ height: `${Math.max(6, peak * 100)}%` }}
                />
              );
            })}
          </div>

          {/* Dimmed regions outside selection */}
          <div className="absolute inset-y-0 left-0 bg-black/50" style={{ width: `${startPct}%` }} />
          <div className="absolute inset-y-0 right-0 bg-black/50" style={{ width: `${100 - endPct}%` }} />

          {/* Playhead */}
          {isPlaying && (
            <div className="absolute inset-y-0 w-px bg-amber" style={{ left: `${playheadPct}%` }} />
          )}

          {/* Drag handles */}
          <div
            onPointerDown={(e) => startDrag("start", e)}
            className="absolute inset-y-0 z-10 flex w-3 -translate-x-1/2 cursor-ew-resize items-center justify-center"
            style={{ left: `${startPct}%` }}
          >
            <div className="h-full w-1 rounded-full bg-spectrum shadow-lg" />
          </div>
          <div
            onPointerDown={(e) => startDrag("end", e)}
            className="absolute inset-y-0 z-10 flex w-3 -translate-x-1/2 cursor-ew-resize items-center justify-center"
            style={{ left: `${endPct}%` }}
          >
            <div className="h-full w-1 rounded-full bg-spectrum shadow-lg" />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <Button type="button" variant="secondary" size="sm" onClick={togglePreview}>
          {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          {isPlaying ? "Pause" : "Preview selection"}
        </Button>
        <span className="font-mono text-[11px] text-ink-faint">Drag the handles for sample-accurate trims</span>
      </div>

      <audio
        ref={audioRef}
        src={sourceUrl}
        onTimeUpdate={handleTimeUpdate}
        aria-label="Audio preview"
        className="hidden"
      />
    </div>
  );
}
