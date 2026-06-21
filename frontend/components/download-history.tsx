"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Trash2, Download, Copy, Share2, Search, Music2 } from "lucide-react";
import { Input } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { ConversionRecord } from "@/lib/types";
import { formatBytes, formatRelativeTime, formatDuration, cn } from "@/lib/utils";
import { pushToast } from "@/hooks/use-toast";

export function DownloadHistory() {
  const [items, setItems] = useState<ConversionRecord[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  async function load(query?: string) {
    setLoading(true);
    try {
      const { history } = await api.getHistory(query);
      setItems(history);
    } catch {
      pushToast({ title: "Couldn't load history", variant: "error" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => load(search || undefined), 350);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function handleFavorite(id: string) {
    const updated = await api.toggleFavorite(id);
    setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
  }

  async function handleDelete(id: string) {
    await api.deleteHistoryItem(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    pushToast({ title: "Removed from history" });
  }

  function handleCopyLink(id: string) {
    navigator.clipboard.writeText(window.location.origin + api.downloadUrl(id));
    pushToast({ title: "Link copied", description: "Paste it anywhere to share this download.", variant: "success" });
  }

  async function handleShare(record: ConversionRecord) {
    const url = window.location.origin + api.downloadUrl(record.id);
    if (navigator.share) {
      await navigator.share({ title: record.video.title, url }).catch(() => undefined);
    } else {
      handleCopyLink(record.id);
    }
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search your conversion history…"
          className="pl-9"
        />
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-ink-faint">Loading history…</p>
      ) : items.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-faint">No conversions yet — your downloads will show up here.</p>
      ) : (
        <ul className="space-y-2">
          <AnimatePresence initial={false}>
            {items.map((item) => (
              <motion.li
                key={item.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, height: 0 }}
                className="glass-panel glass-panel-hover flex items-center gap-3 p-3"
              >
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-black/40">
                  {item.video.thumbnail ? (
                    <Image src={item.video.thumbnail} alt={item.video.title} fill className="object-cover" unoptimized />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Music2 className="h-4 w-4 text-ink-faint" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{item.video.title}</p>
                  <p className="font-mono text-[11px] text-ink-faint">
                    {item.format} · {item.bitrateKbps}kbps ·{" "}
                    {item.trimStartSec != null
                      ? `${formatDuration(item.trimStartSec)}–${formatDuration(item.trimEndSec ?? 0)}`
                      : formatDuration(item.video.durationSec)}{" "}
                    · {item.actualBytes ? formatBytes(item.actualBytes) : "—"} · {formatRelativeTime(item.createdAt)}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => handleFavorite(item.id)}
                    aria-label="Toggle favorite"
                    className={cn("rounded-md p-1.5 hover:bg-white/5", item.isFavorite ? "text-amber" : "text-ink-faint")}
                  >
                    <Star className="h-4 w-4" fill={item.isFavorite ? "currentColor" : "none"} />
                  </button>
                  <button onClick={() => handleCopyLink(item.id)} aria-label="Copy link" className="rounded-md p-1.5 text-ink-faint hover:bg-white/5 hover:text-ink">
                    <Copy className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleShare(item)} aria-label="Share" className="rounded-md p-1.5 text-ink-faint hover:bg-white/5 hover:text-ink">
                    <Share2 className="h-4 w-4" />
                  </button>
                  {item.status === "COMPLETED" && (
                    <a href={api.downloadUrl(item.id)} download aria-label="Download" className="rounded-md p-1.5 text-ink-faint hover:bg-white/5 hover:text-cyan">
                      <Download className="h-4 w-4" />
                    </a>
                  )}
                  <button onClick={() => handleDelete(item.id)} aria-label="Delete" className="rounded-md p-1.5 text-ink-faint hover:bg-danger/10 hover:text-danger">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}
