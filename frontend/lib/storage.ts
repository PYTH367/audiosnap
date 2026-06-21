// ────────────────────────────────────────────────────────────
// AudioSnap doesn't require an account. Instead, each browser gets a
// random id (persisted in localStorage) that the backend uses to scope
// history/favorites/stats. This file is the ONLY place that touches
// localStorage directly — everything else goes through these helpers.
// ────────────────────────────────────────────────────────────
const CLIENT_ID_KEY = "audiosnap:clientId";

export function getClientId(): string {
  if (typeof window === "undefined") return "";

  let id = window.localStorage.getItem(CLIENT_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(CLIENT_ID_KEY, id);
  }
  return id;
}

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
