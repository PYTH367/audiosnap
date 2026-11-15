"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Download, Loader2, XCircle } from "lucide-react";
import { Progress } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { ConversionRecord } from "@/lib/types";
import { formatBytes, cn } from "@/lib/utils";
import { pushToast } from "@/hooks/use-toast";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Queued…",
  ANALYZING: "Reading source…",
  CONVERTING: "Converting audio…",
  TRIMMING: "Trimming selection…",
  COMPLETED: "Ready to download",
  FAILED: "Conversion failed",
};

interface ConversionProgressProps {
  conversionId: string;
  fileLabel: string;
  onComplete?: (record: ConversionRecord) => void;
}

export function ConversionProgress({ conversionId, fileLabel, onComplete }: ConversionProgressProps) {
  const [record, setRecord] = useState<ConversionRecord | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const hasNotified = useRef(false);

  useEffect(() => {
    pollRef.current = setInterval(async () => {
      try {
        const updated = await api.getConversionStatus(conversionId);
        setRecord(updated);

        if (updated.status === "COMPLETED" || updated.status === "FAILED") {
          clearInterval(pollRef.current);
          if (!hasNotified.current) {
            hasNotified.current = true;
            if (updated.status === "COMPLETED") {
              pushToast({ title: "Conversion complete", description: fileLabel, variant: "success" });
              onComplete?.(updated);
            } else {
              pushToast({ title: "Conversion failed", description: updated.errorMessage ?? undefined, variant: "error" });
            }
          }
        }
      } catch (err) {
        clearInterval(pollRef.current);
        pushToast({
          title: "Couldn't check conversion status",
          description: err instanceof Error ? err.message : "Please refresh and check your history.",
          variant: "error",
        });
      }
    }, 1200);

    return () => clearInterval(pollRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversionId]);

  const status = record?.status ?? "PENDING";
  const isDone = status === "COMPLETED";
  const isFailed = status === "FAILED";

  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="glass-panel p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          {isDone ? (
            <CheckCircle2 className="h-4 w-4 text-success" />
          ) : isFailed ? (
            <XCircle className="h-4 w-4 text-danger" />
          ) : (
            <Loader2 className="h-4 w-4 animate-spin text-cyan" />
          )}
          <span className={cn(isFailed && "text-danger")}>{STATUS_LABEL[status]}</span>
        </div>
        <span className="font-mono text-xs text-ink-faint">{record?.progress ?? 0}%</span>
      </div>

      <Progress value={record?.progress ?? 0} className="mt-3" spectrum={!isFailed} />

      {isDone && record?.downloadUrl && (
        <div className="mt-3 flex items-center justify-between">
          <span className="font-mono text-xs text-ink-faint">
            {record.actualBytes ? formatBytes(record.actualBytes) : "Ready"}
          </span>
          <Button
            size="sm"
            variant="primary"
            onClick={() =>
              api.downloadFile(record.id, fileLabel, record.format).catch((err: Error) =>
                pushToast({ title: "Download failed", description: err.message, variant: "error" })
              )
            }
          >
            <Download className="h-3.5 w-3.5" /> Download
          </Button>
        </div>
      )}
    </motion.div>
  );
}
