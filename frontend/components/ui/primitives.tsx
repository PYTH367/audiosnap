"use client";

import { HTMLAttributes, InputHTMLAttributes, forwardRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// ── Card ──────────────────────────────────────────────────────
export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("glass-panel p-5", className)} {...props} />
  )
);
Card.displayName = "Card";

// ── Input ─────────────────────────────────────────────────────
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-11 w-full rounded-lg bg-black/30 border border-glass-border px-4 text-sm text-ink placeholder:text-ink-faint",
        "focus:border-cyan/50 focus:outline-none focus:ring-2 focus:ring-cyan/20 transition-colors",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

// ── Progress ──────────────────────────────────────────────────
interface ProgressProps {
  value: number; // 0-100
  className?: string;
  /** Use the multi-color spectrum fill for the primary conversion bar; plain cyan elsewhere. */
  spectrum?: boolean;
}

export function Progress({ value, className, spectrum = true }: ProgressProps) {
  return (
    <div
      className={cn("h-2 w-full overflow-hidden rounded-full bg-white/5", className)}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <motion.div
        className={cn("h-full rounded-full", spectrum ? "bg-spectrum" : "bg-cyan")}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        transition={{ type: "spring", stiffness: 80, damping: 20 }}
      />
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-shimmer rounded-md bg-gradient-to-r from-white/5 via-white/10 to-white/5",
        className
      )}
      style={{ backgroundSize: "800px 100%" }}
    />
  );
}

/** A row-shaped skeleton matching the metadata card layout, shown while /api/analyze is in flight. */
export function MetadataSkeleton() {
  return (
    <div className="glass-panel flex items-center gap-4 p-4">
      <Skeleton className="h-20 w-32 shrink-0 rounded-lg" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-3 w-1/4" />
      </div>
    </div>
  );
}
