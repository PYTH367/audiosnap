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
- A GitHub-authenticated dashboard with history, search, favorites,
  and stats scoped to the signed-in account.
- Rate limiting, input validation, and DNS-pinned public-URL downloads,
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
Open `backend/.env` and set these values for the Docker setup. Generate a
random 32-byte API token secret with
`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
and use that same value in the backend and frontend env files:

```dotenv
DATABASE_URL="postgresql://audiosnap:audiosnap-local@localhost:5432/audiosnap?schema=public"
REDIS_URL="redis://localhost:6379"
CLIENT_ORIGIN="http://localhost:3000"
API_TOKEN_SECRET="<same-random-secret-in-both-env-files>"
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
Create a GitHub OAuth App with homepage `http://localhost:3000` and
callback `http://localhost:3000/api/auth/callback/github`; copy its
client ID and secret into `GITHUB_ID` and `GITHUB_SECRET`. Generate a
separate random value for `NEXTAUTH_SECRET`. The app will not allow API
requests until GitHub sign-in succeeds.

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

For a no-cost demo, use [Neon](https://neon.tech/) for PostgreSQL and
[Redis Cloud](https://redis.io/try-free/) for Redis if their free plans
are available for your account and region. AudioSnap requires a standard
Redis connection because BullMQ workers use blocking Redis commands; do
not use a Redis REST-only endpoint. Never enable a paid plan or add a
billing method unless you have checked its terms and explicitly chosen
to pay.
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
requires `DATABASE_URL`, `REDIS_URL`, `API_TOKEN_SECRET`, and
`CLIENT_ORIGIN`; set the GitHub OAuth and auth-secret values in the
frontend environment as well.

| Variable | File | Required/default | What to set |
|---|---|---|---|
| `DATABASE_URL` | backend | **Required** | PostgreSQL connection string. Local Docker example: `postgresql://audiosnap:audiosnap-local@localhost:5432/audiosnap?schema=public`. |
| `REDIS_URL` | backend | **Required** | Redis connection URL. Use the provider's exact URL for hosted Redis. |
| `API_TOKEN_SECRET` | both | **Required** | Random secret of at least 32 characters; must match in backend and frontend. |
| `CLIENT_ORIGIN` | backend | **Required** | Frontend origin allowed by CORS, with no path or trailing slash (for example `https://your-app.vercel.app`). |
| `GITHUB_ID` / `GITHUB_SECRET` | frontend | **Required** | Credentials for a GitHub OAuth App. |
| `NEXTAUTH_URL` | frontend | **Required in production** | Frontend origin (for example `https://your-app.vercel.app`). |
| `NEXTAUTH_SECRET` | frontend | **Required** | Random secret of at least 32 characters; keep it private. |
| `PORT` | backend | `4000` | Port for the Express API. |
| `NODE_ENV` | backend | `development` | Usually `development` locally and `production` when deployed. |
| `TMP_DIR` | backend | `./tmp` | Temporary download/conversion files. Use writable storage (for example `/tmp/audiosnap` on Render). |
| `TMP_FILE_TTL_MINUTES` | backend | `60` | How long completed output files are retained before cleanup. |
| `RATE_LIMIT_WINDOW_MINUTES` | backend | `15` | Rate-limit time window. |
| `RATE_LIMIT_MAX_REQUESTS` | backend | `100` | Requests allowed per window by the standard limiter. |
| `MAX_VIDEO_DURATION_SECONDS` | backend | `7200` | Maximum supported source duration. |
| `MAX_SOURCE_SIZE_BYTES` | backend | `268435456` | Maximum downloaded source size (256 MiB). |
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

- **Client** — a stable GitHub account id from the verified API token;
  scopes history across devices.
- **VideoMetadata** — cached preview data per URL (title, thumbnail,
  duration, platform), unique on `url`.
- **Conversion** — one row per export job: format, bitrate, optional
  trim window, status/progress, output path, favorite flag.
- **SearchHistory** — every URL a client has pasted, independent of
  whether it was converted.

Run `npx prisma studio` from `backend/` to browse the data visually.

## API reference

All endpoints under `/api` require a short-lived signed Bearer token
issued to the browser after GitHub sign-in. The health endpoint is
public and checks the database and Redis queue.

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
  Zod (`backend/src/middleware/validate.middleware.ts`). Direct media
  downloads reject non-public DNS results, pin outbound connections to
  the validated IP, revalidate redirects, and enforce source-size and
  duration limits.
- **Authentication**: GitHub OAuth protects account-scoped history;
  API requests require short-lived signed tokens. Configure OAuth secrets
  only in local ignored env files and provider dashboards.
- **Temp file cleanup**: downloaded source files and converted outputs
  live in `TMP_DIR` and are deleted on a TTL timer, with a periodic
  sweep that catches anything orphaned by a crash (`cleanup.service.ts`).
- **Queue-based processing**: conversions run on a BullMQ queue with
  capped concurrency so a burst of requests can't spawn unbounded
  `ffmpeg` processes.
- **Metadata caching**: repeated analyzes of the same URL are served
  from an in-process cache for `METADATA_CACHE_TTL_SECONDS`.

## Deployment

### Free-tier demo: Render API + Vercel frontend

This route avoids Railway. It uses a Render web service, Vercel, and
separate PostgreSQL and Redis providers. Availability and free-tier
limits can change; confirm each dashboard says **Free** before creating
anything. Do not add a card or enable a paid instance. Render's free
service uses temporary local storage and may sleep, so completed audio
files can disappear on restart and long conversions are not guaranteed.
This is suitable for a demo, not reliable production hosting.

#### 1. Create free database and Redis endpoints

Create a free PostgreSQL database on Neon and a standard Redis database
on Redis Cloud, if the dashboards offer no-cost plans for your account
and region. Copy their connection strings; Redis must be a `redis://` or
`rediss://` endpoint compatible with BullMQ, not a REST URL. Keep both
values private. If either provider asks for payment details or a paid
plan, stop and do not proceed.

#### 2. Deploy the backend to Render

1. In Render, create a **Blueprint** from this GitHub repository. The
   checked-in [`render.yaml`](render.yaml) selects the free web-service
   plan, uses `backend/`, builds the app, applies Prisma migrations, and
   checks `/health`.
2. Before confirming creation, verify the plan is **Free** and no paid
   database, Redis service, or disk is being added.
3. Set the Blueprint's prompted environment values:
   - `DATABASE_URL`: your PostgreSQL connection string.
   - `REDIS_URL`: your Redis TCP connection string.
   - `CLIENT_ORIGIN`: the exact production Vercel origin, with no path
     or trailing slash.
   - `API_TOKEN_SECRET`: a random secret of at least 32 characters.
4. After the first successful deploy, copy the public Render URL, such
   as `https://audiosnap-api.onrender.com`.

#### 3. Deploy the frontend to Vercel

1. Import the same GitHub repository into Vercel and set the root
   directory to `frontend/`.
2. Set `NEXT_PUBLIC_API_URL` to the Render URL plus `/api`, for example
   `https://audiosnap-api.onrender.com/api`.
3. Create a GitHub OAuth App with the deployed frontend as its homepage
   and callback URL
   `https://<your-vercel-domain>/api/auth/callback/github`.
4. Set these Vercel environment variables:
   - `GITHUB_ID` and `GITHUB_SECRET` from the OAuth App.
   - `NEXTAUTH_URL` to the exact production Vercel origin.
   - `NEXTAUTH_SECRET` to a separate random secret of at least 32
     characters.
   - `API_TOKEN_SECRET` to the exact same value configured on Render.
5. Deploy the frontend. Then update Render's `CLIENT_ORIGIN` to that
   exact Vercel production origin and redeploy/restart the API if needed.

Generate random secrets locally with:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

FFmpeg and ffprobe binaries are installed through the backend npm
dependencies. Keep one backend instance: output files are local to the
instance, and this setup does not use a persistent disk or shared object
storage.

### Post-deploy checklist

- [ ] `GET https://<render-url>/health` returns `{ status: "ok" }`
- [ ] Backend starts without FFmpeg/ffprobe initialization errors
- [ ] Production `DATABASE_URL`, `REDIS_URL`, and `CLIENT_ORIGIN` are set
- [ ] A test conversion against a direct `.mp4` URL completes end-to-end
- [ ] CORS: confirm the deployed frontend can call the API without
      browser console errors
