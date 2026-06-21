"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Music2, CheckCircle2, Star, HardDrive } from "lucide-react";
import { Card } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import { DashboardStats } from "@/lib/types";
import { formatBytes } from "@/lib/utils";

const STAT_ICONS = [Music2, CheckCircle2, Star, HardDrive];

export function DashboardStatsPanel() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    api.getStats().then(setStats).catch(() => undefined);
  }, []);

  const cards = stats
    ? [
        { label: "Total conversions", value: stats.totalConversions.toString() },
        { label: "Completed", value: stats.completed.toString() },
        { label: "Favorites", value: stats.favorites.toString() },
        { label: "Total downloaded", value: formatBytes(stats.totalBytesDownloaded) },
      ]
    : [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(stats ? cards : Array.from({ length: 4 })).map((card, i) => {
          const Icon = STAT_ICONS[i];
          return (
            <Card key={i} className="flex flex-col gap-2">
              <Icon className="h-4 w-4 text-cyan" />
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-display text-xl font-bold"
              >
                {card ? (card as any).value : "—"}
              </motion.span>
              <span className="text-xs text-ink-faint">{card ? (card as any).label : "Loading…"}</span>
            </Card>
          );
        })}
      </div>

      {stats && stats.formatBreakdown.length > 0 && (
        <Card>
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-faint">By format</p>
          <div className="space-y-2">
            {stats.formatBreakdown.map((row) => {
              const pct = stats.totalConversions ? (row.count / stats.totalConversions) * 100 : 0;
              return (
                <div key={row.format} className="flex items-center gap-3">
                  <span className="w-10 font-mono text-xs text-ink-muted">{row.format}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
                    <motion.div
                      className="h-full rounded-full bg-spectrum"
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6 }}
                    />
                  </div>
                  <span className="w-8 text-right font-mono text-xs text-ink-faint">{row.count}</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
