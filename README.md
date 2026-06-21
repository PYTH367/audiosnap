# AudioSnap

A full-stack app that turns video links into clean, trimmed audio files —
Next.js 15 + TypeScript frontend, Express + Prisma + FFmpeg backend,
queue-based conversion, a real waveform trimmer, and a history dashboard.

```
audiosnap/
├── frontend/   Next.js 15 (App Router), Tailwind, Framer Motion
├── backend/    Express, Prisma/PostgreSQL, BullMQ/Redis, FFmpeg
└── docs/       (this README covers install + deploy; see also
                 backend/src/services/extractors/README.md)
```

## ⚠️ Read this before you deploy publicly

AudioSnap's UI accepts links from YouTube, YouTube Shorts, Instagram
Reels, TikTok, Facebook, and Twitter/X, and will show a full metadata
preview (title, thumbnail, author, duration) for them using each
platform's **official, public oEmbed endpoint** — the same mechanism
Slack/Discord use for link previews.

What it **doesn't** do is actually download/rip audio from those five
platforms. All of them prohibit downloading video/audio through
anything other than their own app, and a generic "paste any link, get
an MP3" tool is the exact pattern that's drawn repeated copyright
litigation (e.g. the RIAA's actions against youtube-mp3.org and similar
sites). So `fetchSourceMedia()` for those platforms intentionally throws
instead of quietly scraping them — see
`backend/src/services/extractors/README.md` for the full reasoning and
for how to wire up an authorized, credentialed adapter if you have a
legitimate use case (your own channel, a license, or a granted API
scope).

**What does work end-to-end** — analyze → trim → convert → download —
is any **direct, publicly hosted video URL** (a CDN `.mp4`, your own
S3/Cloudflare-hosted file, anything you have the rights to process).
Use that for testing the full pipeline.

## Features

- Paste-a-URL flow with drag-and-drop, batch mode (up to 10 links), and
  a metadata preview (title/thumbnail/duration/author) for every
  supported platform.
- Audio export to MP3, WAV, M4A, or AAC at 128/192/256/320kbps, with a
  size estimate shown before you convert.
- A real waveform trimmer (peaks generated server-side via FFmpeg/PCM
  sampling) with draggable handles, accurate timestamps, and in-browser
  preview of the selection.
- Queue-based background processing (BullMQ + Redis) so conversion
  never blocks the API, with live progress polling and an animated
  progress bar.
- A no-login dashboard (anonymous per-device id) with history, search,
  favorites, and stats — copy-link and native share for any completed
  download.
- Rate limiting, input/URL validation (with basic SSRF protection),
  centralized error handling, and scheduled temp-file cleanup.

## Prerequisites

- Node.js 20+
- PostgreSQL 14+ (a local install, Docker, or a hosted instance)
- Redis 6+ (for the BullMQ job queue + used by the metadata cache)
- FFmpeg installed and on your `PATH` (`ffmpeg -version` should work)
  — install via `brew install ffmpeg` (macOS), `apt install ffmpeg`
  (Debian/Ubuntu), or the [official builds](https://ffmpeg.org/download.html).

## Local installation

```bash
# 1. Backend
cd backend
cp .env.example .env        # fill in DATABASE_URL / REDIS_URL
npm install
npx prisma migrate dev --name init
npm run dev                 # http://localhost:4000

# 2. Frontend (separate terminal)
cd frontend
cp .env.example .env.local
npm install
npm run dev                 # http://localhost:3000
```

Paste a direct video URL (e.g. a sample `.mp4` link) on the homepage to
exercise the full analyze → trim → convert → download flow.

### Running the worker separately (optional)

By default `npm run dev`/`npm start` in `backend/` runs the HTTP API
and the BullMQ worker in the same process. For higher throughput, run
them as two processes:

```bash
npm run dev      # API only process also still starts the worker today —
npm run worker   # use this as a second Railway service if you split them
```

## Environment variables

See `backend/.env.example` and `frontend/.env.example` for the full,
commented list. The essentials:

| Variable | Where | Purpose |
|---|---|---|
| `DATABASE_URL` | backend | PostgreSQL connection string (Prisma) |
| `REDIS_URL` | backend | BullMQ queue + rate-limit backing store |
| `CLIENT_ORIGIN` | backend | CORS allow-list — your frontend's URL |
| `TMP_DIR` / `TMP_FILE_TTL_MINUTES` | backend | scratch space + cleanup window for downloaded/converted files |
| `NEXT_PUBLIC_API_URL` | frontend | Base URL the browser calls — your backend's URL |

## Database schema

Defined in `backend/prisma/schema.prisma`:

- **Client** — an anonymous per-device id (no login); scopes history.
- **VideoMetadata** — cached preview data per URL (title, thumbnail,
  duration, platform), unique on `url`.
- **Conversion** — one row per export job: format, bitrate, optional
  trim window, status/progress, output path, favorite flag.
- **SearchHistory** — every URL a client has pasted, independent of
  whether it was converted.

Run `npx prisma studio` from `backend/` to browse the data visually.

## API reference

All endpoints are under `/api` and require an `X-Client-Id` header
(any reasonably-random string ≥10 chars — the frontend generates a
UUID once and persists it in `localStorage`).

| Method & path | Description |
|---|---|
| `POST /api/analyze` | `{ url }` → metadata + per-format size estimates |
| `POST /api/analyze/batch` | `{ urls: string[] }` (max 10) → array of per-URL results |
| `POST /api/convert` | `{ url, format, bitrateKbps }` → `202` + `conversionId` |
| `GET /api/convert/:id` | poll job status/progress |
| `POST /api/trim` | `{ url, format, bitrateKbps, trimStartSec, trimEndSec }` → `202` + `conversionId` |
| `GET /api/waveform?url=` | downsampled peak array + duration, for the trimmer UI |
| `GET /api/history?search=` | list this client's conversions |
| `GET /api/history/stats` | dashboard counters + format breakdown |
| `GET /api/history/favorites` | favorited conversions |
| `GET /api/history/searches` | recently pasted URLs |
| `PATCH /api/history/:id/favorite` | toggle favorite |
| `DELETE /api/history/:id` | delete a history entry |
| `GET /api/download/:id` | stream the completed audio file |

## Security & performance notes

- **Rate limiting**: a generous global limiter plus a stricter one on
  `/analyze`, `/convert`, and `/trim` (`backend/src/middleware/rateLimit.middleware.ts`).
- **Input/URL validation**: every body/query/param is validated with
  Zod (`backend/src/middleware/validate.middleware.ts`); URLs are
  checked for scheme and rejected if they resolve to localhost/private
  IP ranges before the server makes any outbound request to them
  (`backend/src/utils/urlValidator.ts`).
- **Anonymous client ids are not an auth system.** Anyone who guesses
  or copies another client's id header can read that client's history.
  This is fine for an MVP/demo; if you need real per-user privacy,
  put a real auth layer (sessions/JWT) in front of `clientId.middleware.ts`.
- **Temp file cleanup**: downloaded source files and converted outputs
  live in `TMP_DIR` and are deleted on a TTL timer, with a periodic
  sweep that catches anything orphaned by a crash (`cleanup.service.ts`).
- **Queue-based processing**: conversions run on a BullMQ queue with
  capped concurrency so a burst of requests can't spawn unbounded
  `ffmpeg` processes.
- **Metadata caching**: repeated analyzes of the same URL are served
  from an in-process cache for `METADATA_CACHE_TTL_SECONDS`.

## Deployment

### Backend → Railway

1. Push this repo to GitHub and create a new Railway project from it,
   selecting `backend/` as the root directory (or deploy it as its own
   repo).
2. Add the **PostgreSQL** and **Redis** plugins from Railway's
   marketplace — it will inject `DATABASE_URL`/`REDIS_URL` automatically
   (matching the names this project already expects).
3. Add a build step that installs FFmpeg — easiest path is a
   `nixpacks.toml` in `backend/`:
   ```toml
   [phases.setup]
   nixPkgs = ["ffmpeg"]
   ```
4. Set the remaining env vars from `.env.example` (`CLIENT_ORIGIN` =
   your Vercel URL, `TMP_DIR=/tmp/audiosnap`, etc.) in the Railway
   dashboard.
5. Build command: `npm install && npm run build && npx prisma migrate deploy`.
   Start command: `npm start`.
6. Once deployed, note the public URL (e.g.
   `https://audiosnap-api.up.railway.app`) — you'll need it for the
   frontend's `NEXT_PUBLIC_API_URL`.

### Frontend → Vercel

1. Import the repo into Vercel, set the root directory to `frontend/`.
2. Add the environment variable `NEXT_PUBLIC_API_URL` =
   `https://audiosnap-api.up.railway.app/api`.
3. Deploy — Vercel auto-detects Next.js 15 and handles the build.
4. Back on Railway, set `CLIENT_ORIGIN` to your Vercel domain so CORS
   allows the deployed frontend to call the API.

### Post-deploy checklist

- [ ] `GET https://<railway-url>/health` returns `{ status: "ok" }`
- [ ] `ffmpeg -version` succeeds inside the Railway build (check logs)
- [ ] A test conversion against a direct `.mp4` URL completes end-to-end
- [ ] CORS: confirm the deployed frontend can call the API without
      browser console errors
