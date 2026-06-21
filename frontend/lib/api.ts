// ────────────────────────────────────────────────────────────
// Every backend call goes through here so there's exactly one place
// that knows the base URL, attaches the anonymous X-Client-Id header,
// and normalizes error handling into a thrown Error with a readable
// message (components catch this and pass `.message` to the toast).
// ────────────────────────────────────────────────────────────
import { getClientId } from "./storage";
import { AudioFormat, Bitrate, ConversionRecord, DashboardStats, VideoMetadata } from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-Client-Id": getClientId(),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? "Something went wrong. Please try again.");
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  analyze: (url: string) => request<VideoMetadata>("/analyze", { method: "POST", body: JSON.stringify({ url }) }),

  analyzeBatch: (urls: string[]) =>
    request<{ results: { url: string; success: boolean; metadata?: VideoMetadata; error?: string }[] }>(
      "/analyze/batch",
      { method: "POST", body: JSON.stringify({ urls }) }
    ),

  convert: (url: string, format: AudioFormat, bitrateKbps: Bitrate) =>
    request<{ conversionId: string; status: string; estimatedBytes: number }>("/convert", {
      method: "POST",
      body: JSON.stringify({ url, format, bitrateKbps }),
    }),

  trim: (
    url: string,
    format: AudioFormat,
    bitrateKbps: Bitrate,
    trimStartSec: number,
    trimEndSec: number
  ) =>
    request<{ conversionId: string; status: string; estimatedBytes: number }>("/trim", {
      method: "POST",
      body: JSON.stringify({ url, format, bitrateKbps, trimStartSec, trimEndSec }),
    }),

  getConversionStatus: (id: string) => request<ConversionRecord>(`/convert/${id}`),

  getWaveform: (url: string) =>
    request<{ peaks: number[]; durationSec: number }>(`/waveform?url=${encodeURIComponent(url)}`),

  getHistory: (search?: string) =>
    request<{ history: ConversionRecord[] }>(`/history${search ? `?search=${encodeURIComponent(search)}` : ""}`),

  getFavorites: () => request<{ favorites: ConversionRecord[] }>("/history/favorites"),

  getStats: () => request<DashboardStats>("/history/stats"),

  deleteHistoryItem: (id: string) => request<void>(`/history/${id}`, { method: "DELETE" }),

  toggleFavorite: (id: string) => request<ConversionRecord>(`/history/${id}/favorite`, { method: "PATCH" }),

  downloadUrl: (id: string) => `${BASE_URL}/download/${id}`,
};
