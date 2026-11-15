"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Trash2, Download, Search, Music2 } from "lucide-react";
import { Input } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import { ConversionRecord } from "@/lib/types";
import { formatBytes, formatRelativeTime, formatDuration, cn } from "@/lib/utils";
import { pushToast } from "@/hooks/use-toast";

export function DownloadHistory() {
  const [items, setItems] = useState<ConversionRecord[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const timeout = setTimeout(() => {
      api
        .getHistory(search || undefined)
        .then(({ history }) => {
          if (active) setItems(history);
        })
        .catch((err: Error) => {
          if (active) pushToast({ title: "Couldn't load history", description: err.message, variant: "error" });
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, search ? 350 : 0);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [search]);

  async function handleFavorite(id: string) {
    try {
      const updated = await api.toggleFavorite(id);
      setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
    } catch (err) {
      pushToast({
        title: "Couldn't update favorite",
        description: err instanceof Error ? err.message : undefined,
        variant: "error",
      });
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.deleteHistoryItem(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      pushToast({ title: "Removed from history" });
    } catch (err) {
      pushToast({
        title: "Couldn't remove conversion",
        description: err instanceof Error ? err.message : undefined,
        variant: "error",
      });
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
                  {item.status === "COMPLETED" && (
                    <button
                      onClick={() =>
                        api.downloadFile(item.id, item.video.title, item.format).catch((err: Error) =>
                          pushToast({ title: "Download failed", description: err.message, variant: "error" })
                        )
                      }
                      aria-label="Download"
                      className="rounded-md p-1.5 text-ink-faint hover:bg-white/5 hover:text-cyan"
                    >
                      <Download className="h-4 w-4" />
                    </button>
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
