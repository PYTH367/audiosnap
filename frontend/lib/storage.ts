// ────────────────────────────────────────────────────────────
// Recent URLs are mirrored locally for faster display on page load.
// ────────────────────────────────────────────────────────────
// Recent conversions are also mirrored locally so the dropzone can show
// "recent" instantly on load without waiting on a network round-trip.
const RECENTS_KEY = "audiosnap:recents";
const MAX_RECENTS = 8;

export interface RecentEntry {
  url: string;
  title: string;
  thumbnail: string | null;
  timestamp: number;
}

export function getRecents(): RecentEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(RECENTS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function addRecent(entry: RecentEntry): void {
  if (typeof window === "undefined") return;
  const existing = getRecents().filter((r) => r.url !== entry.url);
  const updated = [entry, ...existing].slice(0, MAX_RECENTS);
  window.localStorage.setItem(RECENTS_KEY, JSON.stringify(updated));
}
