"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DashboardStatsPanel } from "@/components/dashboard-stats";
import { DownloadHistory } from "@/components/download-history";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Link href="/" className="mb-2 inline-flex items-center gap-1.5 text-xs text-ink-faint hover:text-ink">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to converter
          </Link>
          <h1 className="font-display text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-ink-muted">Your conversion history, favorites, and stats.</p>
        </div>
      </div>

      <div className="space-y-8">
        <DashboardStatsPanel />

        <div>
          <h2 className="mb-3 font-display text-lg font-semibold">Download history</h2>
          <DownloadHistory />
        </div>
      </div>
    </main>
  );
}
