"use client";

import { useState, useRef, FormEvent, DragEvent } from "react";
import { motion } from "framer-motion";
import { Link2, Layers, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PLATFORMS = ["YouTube", "Shorts", "Reels", "TikTok", "Facebook", "X / Twitter", "Direct link"];

interface UrlInputDropzoneProps {
  onSubmit: (url: string) => void;
  onSubmitBatch: (urls: string[]) => void;
  isLoading: boolean;
}

export function UrlInputDropzone({ onSubmit, onSubmitBatch, isLoading }: UrlInputDropzoneProps) {
  const [value, setValue] = useState("");
  const [batchMode, setBatchMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;

    if (batchMode) {
      const urls = value
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      onSubmitBatch(urls);
    } else {
      onSubmit(value.trim());
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text/plain");
    if (dropped) {
      setValue((prev) => (batchMode && prev ? `${prev}\n${dropped}` : dropped));
      inputRef.current?.focus();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-xl">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "glass-panel relative flex flex-col gap-2 p-2 transition-all duration-200",
          isDragging && "border-cyan/60 bg-cyan/5 shadow-[0_0_0_4px_rgba(34,211,238,0.12)]"
        )}
      >
        <div className="flex items-center gap-2">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white/5">
            <Link2 className="h-5 w-5 text-cyan" />
          </div>

          {batchMode ? (
            <textarea
              ref={inputRef as any}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={"Paste one URL per line (up to 10)\nhttps://...\nhttps://..."}
              rows={3}
              className="flex-1 resize-none bg-transparent py-2 text-sm text-ink placeholder:text-ink-faint focus:outline-none"
            />
          ) : (
            <input
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Paste a video URL — youtube.com, tiktok.com, a direct .mp4 link..."
              className="h-11 flex-1 bg-transparent text-sm text-ink placeholder:text-ink-faint focus:outline-none"
            />
          )}

          <Button type="submit" disabled={isLoading || !value.trim()} className="shrink-0">
            {isLoading ? "Analyzing…" : "Analyze"}
            {!isLoading && <ArrowRight className="h-4 w-4" />}
          </Button>
        </div>

        <div className="flex items-center justify-between px-1 pb-1">
          <button
            type="button"
            onClick={() => setBatchMode((b) => !b)}
            className={cn(
              "flex items-center gap-1.5 text-xs transition-colors",
              batchMode ? "text-cyan" : "text-ink-faint hover:text-ink-muted"
            )}
          >
            <Layers className="h-3.5 w-3.5" />
            Batch mode {batchMode && "(one URL per line, max 10)"}
          </button>
          {isDragging && <span className="text-xs text-cyan">Drop to paste</span>}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5">
        {PLATFORMS.map((p) => (
          <span key={p} className="text-xs text-ink-faint">
            {p}
          </span>
        ))}
      </div>
    </form>
  );
}
