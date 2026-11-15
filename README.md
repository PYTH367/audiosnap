# AudioSnap

A full-stack app that turns video links into clean, trimmed audio files —
Next.js 16 + TypeScript frontend, Express + Prisma + FFmpeg backend,
queue-based conversion, a real waveform trimmer, and a history dashboard.

```
audiosnap/
├── frontend/   Next.js 16 (App Router), Tailwind, Framer Motion
├── backend/    Express, Prisma/PostgreSQL, BullMQ/Redis, FFmpeg
└── docs/       (this README covers install + deploy; see also
                 backend/src/services/extractors/README.md)
```

## ⚠️ Read this before you deploy publicly

AudioSnap can fetch title/author/thumbnail previews (duration is not
provided) for public YouTube, YouTube Shorts, TikTok, and X/Twitter
links using their oEmbed endpoints. Instagram and Facebook previews
aren't available without a Meta Graph API app token.

Platform links cannot be converted by this app. The complete
analyze → trim → convert → download flow works with direct, publicly
hosted video files you have permission to process. See
`backend/src/services/extractors/README.md` before adding any
platform-specific adapter.

**What does work end-to-end** — analyze → trim → convert → download —
is any **direct, publicly hosted video URL** (a CDN `.mp4`, your own
S3/Cloudflare-hosted file, anything you have the rights to process).
Use that for testing the full pipeline.

## Features

- Paste-a-URL flow with drag-and-drop, batch mode (up to 10 links), and
  metadata previews for supported oEmbed platforms; duration isn't
  available from those providers.
- Audio export to MP3, WAV, M4A, or AAC at 128/192/256/320kbps, with a
  size estimate shown before you convert.
- A real waveform trimmer (peaks generated server-side via FFmpeg/PCM
  sampling) with draggable handles, accurate timestamps, and in-browser
  preview of the selection.
- Queue-based background processing (BullMQ + Redis) so conversion
  never blocks the API, with live progress polling and an animated
  progress bar.
- A no-login dashboard (anonymous per-device id) with history, search,
  favorites, and stats, with downloads scoped to the anonymous client ID.
- Rate limiting, input/URL validation (with basic SSRF protection),
  centralized error handling, and scheduled temp-file cleanup.

## Prerequisites

- Node.js 20.9+ (or a newer LTS release)
- PostgreSQL 14+ (a local install, Docker, or a hosted instance)
- Redis 6+ (for the BullMQ conversion job queue)
- npm (included with Node.js)
- FFmpeg is bundled through npm packages, so a separate system
  installation is not normally needed. `backend/src/config/ffmpegBinary.ts`
  selects the installed binaries.

## Run locally (Windows, macOS, or Linux)

The API needs **both** PostgreSQL and Redis running. PostgreSQL stores
conversion history and metadata; Redis runs the conversion queue. There
is no separate “database ID” to request: `DATABASE_URL` is the complete
connection string for a PostgreSQL database. The steps below use Docker
for both services so the same setup works on Windows, macOS, and Linux.
Commands below assume each terminal is opened at the repository root
unless the step changes into `backend/` or `frontend/`.

### 1. Install the tools

Install Node.js 20.9 or newer from [nodejs.org](https://nodejs.org/) and
install Docker Desktop (or Docker Engine on Linux). Start Docker, then
open **three terminal windows** for the database/cache, backend, and
frontend. Check that the tools are available:

```powershell
node --version
npm --version
docker --version
```

### 2. Start PostgreSQL and Redis

Run these commands once in the first terminal. The `-d` flag keeps each
container running in the background:

```powershell
docker run --name audiosnap-postgres -e POSTGRES_USER=audiosnap -e POSTGRES_PASSWORD=audiosnap-local -e POSTGRES_DB=audiosnap -p 5432:5432 -d postgres:16
docker run --name audiosnap-redis -p 6379:6379 -d redis:7
```

If Docker reports that a container with that name already exists, start
it instead:

```powershell
docker start audiosnap-postgres
docker start audiosnap-redis
```

The local database connection string is:

```text
postgresql://audiosnap:audiosnap-local@localhost:5432/audiosnap?schema=public
```

The parts are `username:password@host:port/database`. If you use an
already-installed PostgreSQL or a hosted provider instead, create a
database named for this app (for example `audiosnap`) and use the
provider's PostgreSQL connection string as `DATABASE_URL`. URL-encode
special characters in the username or password (for example `@` as
`%40`). For hosted databases, copy the connection string from the
provider's database/connect page; do not use a dashboard project ID in
place of the connection string.

### 3. Configure and start the backend

In the second terminal, from the repository root:

```powershell
cd backend
Copy-Item .env.example .env
```

On macOS/Linux, use `cp .env.example .env` instead of `Copy-Item`.
Open `backend/.env` and set at least these values for the Docker setup:

```dotenv
DATABASE_URL="postgresql://audiosnap:audiosnap-local@localhost:5432/audiosnap?schema=public"
REDIS_URL="redis://localhost:6379"
CLIENT_ORIGIN="http://localhost:3000"
```

The `DATABASE_URL` above works with the Docker command in step 2. If
you chose another username, password, host, port, or database name,
update it to match. Do not commit `.env` or paste real production
credentials into source control.

Install backend dependencies, create the Prisma client, and apply the
database schema:

```powershell
npm install
npx prisma generate
npx prisma migrate dev
```

Then start the API:

```powershell
npm run dev
```

The API (including its conversion worker) listens on
`http://localhost:4000`. Keep this terminal open. Check that it started
by opening `http://localhost:4000/health`; it should return JSON with
`"status":"ok"`.

### 4. Configure and start the frontend

In the third terminal, from the repository root:

```powershell
cd frontend
Copy-Item .env.example .env.local
npm install
npm run dev
```

On macOS/Linux, use `cp .env.example .env.local` instead of
`Copy-Item`.
For local development, `frontend/.env.example` already points the
browser to `http://localhost:4000/api`. Open
`http://localhost:3000` in your browser. If you change the API address,
set `NEXT_PUBLIC_API_URL` in `frontend/.env.local` to the backend's
base URL **including `/api`**, then restart the frontend.

### 5. Try the app

Use a direct, publicly reachable video file URL (for example, an `.mp4`
you own or have permission to process). The app should analyze it, let
you select an audio format and optionally trim it, then queue a
conversion and provide a download. YouTube, Instagram, TikTok, Facebook,
and X/Twitter links can provide previews where supported, but this
project intentionally does not download media from those platforms;
see [the extractor notes](backend/src/services/extractors/README.md).

### Hosted database or Redis instead of Docker

For a hosted setup, create a PostgreSQL database and Redis instance
with your hosting provider. Copy their connection URLs into the
backend's environment settings:

- `DATABASE_URL`: the PostgreSQL connection string, usually shown under
  **Connect**, **Connection details**, or **Database URL**. Make sure
  the database exists and the credentials have permission to create
  tables/migrations.
- `REDIS_URL`: the Redis connection string, usually shown under
  **Connect** or **Connection details**. It may start with `rediss://`
  when TLS is required; copy the exact URL supplied by the provider.
- `CLIENT_ORIGIN`: the frontend's origin, such as
  `https://your-app.vercel.app` (no `/api` path).
- `NEXT_PUBLIC_API_URL`: the deployed backend URL with `/api`, such as
  `https://your-api.example.com/api`.

For Railway, add PostgreSQL and Redis services to the project and
reference their generated `DATABASE_URL` and `REDIS_URL` variables from
the backend service. Do not manually invent a database ID or password.
The checked-in initial migration is under
`backend/prisma/migrations/`; `npx prisma migrate deploy` applies it (and
future migrations) to the configured database.

### Running the worker separately (optional)

By default `npm run dev`/`npm start` in `backend/` runs the HTTP API
and the BullMQ worker in the same process. You do not need to start
`npm run worker` for normal local use. That command starts an additional
worker-only process; note that the current API entry point still starts
its own worker, so running both at once means two workers will consume
the queue. Configure a separate API-only entry point before using that
as a strict split deployment.

```bash
npm run dev      # API + worker
npm run worker   # optional additional worker-only process
```

## Environment variables

Both example files contain the configuration used by the app:
`backend/.env.example` and `frontend/.env.example`. Copy them to
`backend/.env` and `frontend/.env.local` respectively. The backend
requires `DATABASE_URL`, `REDIS_URL`, and `CLIENT_ORIGIN`; other backend
settings have defaults.

| Variable | File | Required/default | What to set |
|---|---|---|---|
| `DATABASE_URL` | backend | **Required** | PostgreSQL connection string. Local Docker example: `postgresql://audiosnap:audiosnap-local@localhost:5432/audiosnap?schema=public`. |
| `REDIS_URL` | backend | **Required** | Redis connection URL. Use the provider's exact URL for hosted Redis. |
| `CLIENT_ORIGIN` | backend | **Required** | Frontend origin allowed by CORS, with no path or trailing slash (for example `https://your-app.vercel.app`). |
| `PORT` | backend | `4000` | Port for the Express API. |
| `NODE_ENV` | backend | `development` | Usually `development` locally and `production` when deployed. |
| `TMP_DIR` | backend | `./tmp` | Temporary download/conversion files. Use writable storage (for example `/tmp/audiosnap` on Railway). |
| `TMP_FILE_TTL_MINUTES` | backend | `60` | How long completed output files are retained before cleanup. |
| `RATE_LIMIT_WINDOW_MINUTES` | backend | `15` | Rate-limit time window. |
| `RATE_LIMIT_MAX_REQUESTS` | backend | `100` | Requests allowed per window by the standard limiter. |
| `MAX_VIDEO_DURATION_SECONDS` | backend | `7200` | Maximum supported source duration. |
| `MAX_BATCH_URLS` | backend | `10` | Maximum URLs accepted in one batch request. |
| `METADATA_CACHE_TTL_SECONDS` | backend | `1800` | Metadata cache lifetime. |
| `NEXT_PUBLIC_API_URL` | frontend | `http://localhost:4000/api` in the example | Backend API base URL, including `/api`. Use the publicly reachable backend URL in production. |

### Troubleshooting

- **Backend exits with `DATABASE_URL is required`:** create
  `backend/.env` from `.env.example` and set a non-empty PostgreSQL URL.
- **Prisma cannot connect / `P1001`:** make sure PostgreSQL is running,
  the host/port/database and credentials in `DATABASE_URL` match, and
  port `5432` is not blocked or already occupied.
- **Prisma says the database does not exist:** create it first. With the
  Docker command above, the `POSTGRES_DB=audiosnap` setting creates it
  automatically; otherwise create a database named `audiosnap` in
  PostgreSQL or use the database name your provider supplied.
- **Redis connection errors:** confirm the Redis container/service is
  running and `REDIS_URL` is correct. The API starts a BullMQ worker,
  so Redis is needed even before you submit a conversion.
- **Browser reports a CORS error:** set backend `CLIENT_ORIGIN` to the
  exact frontend origin (scheme, hostname, and port), then restart the
  backend.
- **Frontend reports a network/API error:** check the backend
  `/health` endpoint and verify `NEXT_PUBLIC_API_URL` points to the
  backend URL with `/api`; restart Next.js after changing the value.
- **A platform link previews but cannot convert:** this is intentional
  for platforms whose download is not authorized by this app. Test the
  full conversion flow with a direct media URL you are allowed to use.

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
3. Add a Railway volume mounted at `/data` if you want completed audio
   files to survive service restarts; set `TMP_DIR=/data/audiosnap`.
   Without a volume, Railway's temporary filesystem can lose files on
   restart and users will need to reconvert them.
4. Set `NODE_ENV=production`, `CLIENT_ORIGIN` to the exact Vercel
   origin (no trailing slash or path), and the other backend settings
   from `.env.example`. `DATABASE_URL` and `REDIS_URL` must be the
   Railway-generated connection URLs.
5. Build with `npm run build`. Configure `npx prisma migrate deploy`
   as the **pre-deploy command** so the migration runs with the
   production database available. Set the start command to `npm start`.
6. Once deployed, note the public URL (e.g.
   `https://audiosnap-api.up.railway.app`) — you'll need it for the
   frontend's `NEXT_PUBLIC_API_URL`.

FFmpeg and ffprobe binaries are installed through the backend npm
dependencies, so a separate system package installation is not
required for this setup.

Keep the backend at one replica with this local-disk setup. Multiple
replicas can process a queued job and serve its download from different
machines, where the output file is not present. To scale horizontally,
move converted files to shared object storage and configure a dedicated
worker/API deployment.

### Frontend → Vercel

1. Import the repo into Vercel, set the root directory to `frontend/`.
2. Add the environment variable `NEXT_PUBLIC_API_URL` =
   `https://audiosnap-api.up.railway.app/api` before deploying. Production
   builds fail immediately if it is missing or does not end with `/api`.
3. Deploy — Vercel auto-detects Next.js 16 and handles the build.
4. Back on Railway, set `CLIENT_ORIGIN` to your Vercel domain so CORS
   allows the deployed frontend to call the API.

### Post-deploy checklist

- [ ] `GET https://<railway-url>/health` returns `{ status: "ok" }`
- [ ] Backend starts without FFmpeg/ffprobe initialization errors
- [ ] Production `DATABASE_URL`, `REDIS_URL`, and `CLIENT_ORIGIN` are set
- [ ] A test conversion against a direct `.mp4` URL completes end-to-end
- [ ] CORS: confirm the deployed frontend can call the API without
      browser console errors
