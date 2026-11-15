"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { LayoutDashboard, Scissors, Music2 } from "lucide-react";
import { HeroSection } from "@/components/hero-section";
import { UrlInputDropzone } from "@/components/url-input-dropzone";
import { MetadataCard } from "@/components/metadata-card";
import { FormatQualitySelector } from "@/components/format-quality-selector";
import { WaveformTrimmer } from "@/components/waveform-trimmer";
import { ConversionProgress } from "@/components/conversion-progress";
import { BatchConverter } from "@/components/batch-converter";
import { MetadataSkeleton } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { addRecent } from "@/lib/storage";
import { pushToast } from "@/hooks/use-toast";
import { AudioFormat, Bitrate, VideoMetadata } from "@/lib/types";

export default function HomePage() {
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [batchResults, setBatchResults] = useState<
    Awaited<ReturnType<typeof api.analyzeBatch>>["results"] | null
  >(null);

  const [format, setFormat] = useState<AudioFormat>("MP3");
  const [bitrate, setBitrate] = useState<Bitrate>(192);
  const [trimEnabled, setTrimEnabled] = useState(false);
  const [trim, setTrim] = useState<{ start: number; end: number } | null>(null);

  const [activeConversionId, setActiveConversionId] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  async function handleAnalyze(url: string) {
    setIsAnalyzing(true);
    setBatchResults(null);
    setMetadata(null);
    setActiveConversionId(null);
    setTrimEnabled(false);
    try {
      const result = await api.analyze(url);
      setMetadata(result);
      addRecent({ url, title: result.title, thumbnail: result.thumbnail, timestamp: Date.now() });
    } catch (err) {
      pushToast({ title: "Couldn't analyze that link", description: (err as Error).message, variant: "error" });
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleBatchAnalyze(urls: string[]) {
    setIsAnalyzing(true);
    setMetadata(null);
    try {
      const { results } = await api.analyzeBatch(urls);
      setBatchResults(results);
    } catch (err) {
      pushToast({ title: "Batch analysis failed", description: (err as Error).message, variant: "error" });
    } finally {
      setIsAnalyzing(false);
    }
  }

  const handleTrimChange = useCallback((start: number, end: number) => setTrim({ start, end }), []);

  async function handleConvert() {
    if (!metadata) return;
    setIsStarting(true);
    try {
      const job =
        trimEnabled && trim
          ? await api.trim(metadata.url, format, bitrate, trim.start, trim.end)
          : await api.convert(metadata.url, format, bitrate);
      setActiveConversionId(job.conversionId);
    } catch (err) {
      pushToast({ title: "Couldn't start conversion", description: (err as Error).message, variant: "error" });
    } finally {
      setIsStarting(false);
    }
  }

  return (
    <main>
      <nav className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-4 py-5 sm:px-8">
        <span className="font-display text-lg font-bold tracking-tight">
          Audio<span className="text-cyan">Snap</span>
        </span>
        <Link href="/dashboard">
          <Button variant="secondary" size="sm">
            <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
          </Button>
        </Link>
      </nav>

      <HeroSection>
        <UrlInputDropzone onSubmit={handleAnalyze} onSubmitBatch={handleBatchAnalyze} isLoading={isAnalyzing} />
      </HeroSection>

      <section className="relative mx-auto -mt-6 max-w-2xl space-y-4 px-4 pb-24">
        <AnimatePresence mode="wait">
          {isAnalyzing && !batchResults && (
            <motion.div key="skeleton" exit={{ opacity: 0 }}>
              <MetadataSkeleton />
            </motion.div>
          )}

          {batchResults && (
            <motion.div key="batch" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <BatchConverter
                results={batchResults}
                onSelect={(m) => {
                  setMetadata(m);
                  setBatchResults(null);
                }}
              />
            </motion.div>
          )}

          {metadata && !isAnalyzing && (
            <motion.div key="metadata" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <MetadataCard metadata={metadata} />

              {metadata.canDownload && (
                <div className="glass-panel space-y-4 p-4">
                  <FormatQualitySelector
                    format={format}
                    bitrateKbps={bitrate}
                    onFormatChange={setFormat}
                    onBitrateChange={setBitrate}
                    sizeEstimates={metadata.sizeEstimates}
                  />

                  <button
                    type="button"
                    onClick={() => setTrimEnabled((v) => !v)}
                    className="flex items-center gap-1.5 text-xs text-ink-muted hover:text-cyan"
                  >
                    <Scissors className="h-3.5 w-3.5" />
                    {trimEnabled ? "Cancel trim — export full audio" : "Trim audio before exporting"}
                  </button>

                  {trimEnabled && (
                    <WaveformTrimmer
                      key={metadata.url}
                      sourceUrl={metadata.url}
                      durationSec={metadata.durationSec}
                      onTrimChange={handleTrimChange}
                    />
                  )}

                  <Button onClick={handleConvert} disabled={isStarting} className="w-full">
                    <Music2 className="h-4 w-4" />
                    {isStarting ? "Starting…" : trimEnabled ? "Convert trimmed selection" : "Convert audio"}
                  </Button>
                </div>
              )}

              {activeConversionId && (
                <ConversionProgress
                  conversionId={activeConversionId}
                  fileLabel={metadata.title}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </main>
  );
}
