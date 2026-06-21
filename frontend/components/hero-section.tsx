"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";

// Deterministic pseudo-random heights (sine-based, not Math.random) so
// server and client render identical markup — avoids hydration warnings
// while still looking organic rather than uniform.
function buildBars(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const h = 0.25 + Math.abs(Math.sin(i * 0.45) * 0.5 + Math.sin(i * 1.3) * 0.25);
    const hue = 262 - (i / count) * 90; // violet (262) → cyan/amber range
    return { height: Math.min(1, h), delay: (i % 12) * 0.08, hue };
  });
}

export function HeroWaveform() {
  const bars = useMemo(() => buildBars(72), []);

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 flex h-[420px] items-end justify-center gap-[3px] overflow-hidden px-4 opacity-60 sm:gap-1">
      {bars.map((bar, i) => (
        <motion.span
          key={i}
          className="w-1.5 origin-bottom rounded-full sm:w-2"
          style={{
            height: `${bar.height * 100}%`,
            background: `hsl(${bar.hue} 85% 60%)`,
            boxShadow: `0 0 18px hsl(${bar.hue} 85% 55% / 0.35)`,
          }}
          animate={{ scaleY: [bar.height, bar.height * 0.4, bar.height] }}
          transition={{ duration: 2.4, delay: bar.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-canvas/40 to-canvas" />
    </div>
  );
}

const STEPS = [
  { n: "01", title: "Paste a link", body: "Drop in a video URL — we'll pull the title, thumbnail, and length." },
  { n: "02", title: "Pick a format", body: "MP3, WAV, M4A, or AAC, at 128–320kbps. Trim to the exact moment you need." },
  { n: "03", title: "Download", body: "Watch the progress bar fill, then save the file or grab a share link." },
];

export function HeroSection({ children }: { children: React.ReactNode }) {
  return (
    <section className="relative pb-20 pt-28 sm:pt-32">
      <HeroWaveform />

      <div className="relative mx-auto max-w-3xl px-4 text-center">
        <motion.span
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 rounded-full border border-glass-border bg-glass px-3 py-1 text-xs font-medium text-ink-muted"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          Fast, queue-based conversion
        </motion.span>

        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-6 font-display text-4xl font-bold leading-[1.1] tracking-tight sm:text-6xl"
        >
          Turn any video
          <br />
          into clean <span className="bg-spectrum bg-clip-text text-transparent">audio</span>.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mx-auto mt-4 max-w-xl text-base text-ink-muted sm:text-lg"
        >
          Paste a link, trim it on a real waveform, and export MP3, WAV, M4A, or AAC —
          right from your browser.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-10"
        >
          {children}
        </motion.div>
      </div>

      <div className="relative mx-auto mt-24 max-w-5xl px-4">
        <div className="spectrum-rule mb-10" />
        <div className="grid gap-6 sm:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.n} className="glass-panel p-5">
              <span className="font-mono text-xs text-cyan">{step.n}</span>
              <h3 className="mt-2 font-display text-lg font-semibold">{step.title}</h3>
              <p className="mt-1 text-sm text-ink-muted">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
