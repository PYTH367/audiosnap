"use client";

import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Music2 } from "lucide-react";
import { VideoMetadata } from "@/lib/types";

interface BatchResult {
  url: string;
  success: boolean;
  metadata?: VideoMetadata;
  error?: string;
}

export function BatchConverter({ results, onSelect }: { results: BatchResult[]; onSelect: (m: VideoMetadata) => void }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
        {results.filter((r) => r.success).length} of {results.length} links analyzed
      </p>
      <ul className="space-y-2">
        {results.map((result, i) => (
          <motion.li
            key={result.url}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            className="glass-panel flex items-center gap-3 p-3"
          >
            {result.success ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
            ) : (
              <XCircle className="h-4 w-4 shrink-0 text-danger" />
            )}

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-ink">{result.success ? result.metadata!.title : result.url}</p>
              {!result.success && <p className="text-xs text-danger">{result.error}</p>}
            </div>

            {result.success && (
              <button
                onClick={() => onSelect(result.metadata!)}
                className="flex items-center gap-1 rounded-md bg-white/5 px-2.5 py-1 text-xs text-cyan hover:bg-white/10"
              >
                <Music2 className="h-3 w-3" /> Convert
              </button>
            )}
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
