"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Music2, ShieldAlert, User, Clock } from "lucide-react";
import { VideoMetadata } from "@/lib/types";
import { formatDuration } from "@/lib/utils";

const PLATFORM_LABELS: Record<string, string> = {
  YOUTUBE: "YouTube",
  YOUTUBE_SHORTS: "YouTube Shorts",
  INSTAGRAM: "Instagram",
  TIKTOK: "TikTok",
  FACEBOOK: "Facebook",
  TWITTER: "X / Twitter",
  DIRECT_URL: "Direct link",
  OTHER: "Web video",
};

export function MetadataCard({ metadata }: { metadata: VideoMetadata }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel flex flex-col gap-4 p-4 sm:flex-row sm:items-center"
    >
      <div className="relative h-28 w-full shrink-0 overflow-hidden rounded-lg bg-black/40 sm:w-44">
        {metadata.thumbnail ? (
          <Image src={metadata.thumbnail} alt={metadata.title} fill className="object-cover" unoptimized />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Music2 className="h-8 w-8 text-ink-faint" />
          </div>
        )}
        <span className="absolute bottom-1.5 right-1.5 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[11px] text-ink">
          {metadata.durationSec > 0 ? formatDuration(metadata.durationSec) : "—"}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] font-medium text-ink-muted">
            {PLATFORM_LABELS[metadata.platform] ?? metadata.platform}
          </span>
          {!metadata.canDownload && (
            <span className="flex items-center gap-1 rounded-full bg-amber/10 px-2 py-0.5 text-[11px] font-medium text-amber">
              <ShieldAlert className="h-3 w-3" /> Preview only
            </span>
          )}
        </div>

        <h3 className="mt-1.5 truncate font-display text-base font-semibold text-ink" title={metadata.title}>
          {metadata.title}
        </h3>

        <div className="mt-1 flex items-center gap-4 text-xs text-ink-muted">
          {metadata.author && (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" /> {metadata.author}
            </span>
          )}
          {metadata.durationSec > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> {formatDuration(metadata.durationSec)}
            </span>
          )}
        </div>

        {!metadata.canDownload && (
          <p className="mt-2 text-xs leading-relaxed text-ink-faint">
            AudioSnap can preview this link, but won&apos;t extract audio from {PLATFORM_LABELS[metadata.platform]} —
            that platform&apos;s terms only allow downloads through their own app. Paste a direct video file URL to
            run a full conversion.
          </p>
        )}
      </div>
    </motion.div>
  );
}
