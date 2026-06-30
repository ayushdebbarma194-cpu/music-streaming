# ArchiveTune — Linux Music Streaming Platform

A self-hosted music streaming platform for Linux, rebuilt from the [ArchiveTune](https://github.com/koiverse/ArchiveTune) Android app as a standalone backend + desktop client. Personal use, runs entirely on your own machine.

---

## What is this?

The original ArchiveTune is a Kotlin/Jetpack Compose Android app whose backend logic (network calls, API integrations, caching) is tightly coupled to Android Runtime. This project rebuilds it from scratch as:

1. **A Python FastAPI backend** — headless service handling music resolution, playback (via mpv), downloads, lyrics, scrobbling, AI curation, and translation.
2. **A Tauri desktop client** — native-feeling Linux music player UI (React + TypeScript + Tailwind) that acts as a remote control for the backend.

The frontend never decodes audio itself — the backend's `mpv` instance is the real audio engine. The frontend is a thin, fast UI shell that talks REST/WebSocket.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Desktop Client (Tauri + React + TS + Tailwind)                 │
│  Communicates via REST + WebSocket on localhost                  │
└────────────────────────────┬────────────────────────────────────┘
                             │ http://localhost:8000
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  Backend (Python FastAPI + mpv + SQLite)                         │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ InnerTube    │  │ Playback     │  │ Downloads            │  │
│  │ (ytmusicapi) │  │ (python-mpv) │  │ (httpx streaming)    │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Lyrics       │  │ Scrobbling   │  │ AI Features          │  │
│  │ (waterfall)  │  │ (Last.fm/LB) │  │ (Claude/OpenAI/etc)  │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│  ┌──────────────┐  ┌──────────────────────────────────────────┐ │
│  │ Translation  │  │ Together Mode (WebSocket sync rooms)     │ │
│  └──────────────┘  └──────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Features

| Feature | Description |
|---------|-------------|
| **Music Search & Browse** | Search YouTube Music catalog (songs, albums, artists, playlists) via InnerTube |
| **Audio Playback** | Full mpv-based engine: play, pause, seek, volume, gapless, queue management |
| **Offline Downloads** | Download tracks to disk with live progress tracking |
| **Synced Lyrics** | Multi-source waterfall (Kugou → SimpMusic → YouTube captions), line-by-line sync |
| **Scrobbling** | Automatic Last.fm + ListenBrainz with threshold detection |
| **AI Curation** | Multi-provider LLM (Claude, OpenAI, Gemini, OpenRouter) for playlist curation |
| **AI Lyrics Translation** | Translate lyrics via any configured AI provider |
| **Text Translation** | Google Translate (deep-translator or GCP API) |
| **Material You Theming** | Dynamic color scheme generated from a seed color (HCT algorithm) |
| **Together Mode** | WebSocket rooms for synchronized multi-device playback |

---

## Quick Start

### Option A: Docker (recommended)

```bash
git clone https://github.com/ayushdebbarma194-cpu/music-streaming.git
cd music-streaming

# Configure (all keys are optional — things work without them)
cp .env.example .env

# Build and run
docker compose up --build
```

- **Frontend:** http://localhost:1420
- **Backend:** http://localhost:8000

> **Audio playback note:** mpv inside Docker needs access to your host audio.
> On Linux with PulseAudio, uncomment the PulseAudio volume mounts in
> `docker-compose.yml`. Alternatively, run the backend natively (Option B)
> for seamless audio.

---

### Option B: Run natively

#### Prerequisites

| Requirement | Install |
|-------------|---------|
| Python 3.11+ | Your distro's package manager or [pyenv](https://github.com/pyenv/pyenv) |
| Node.js 18+ | [nvm](https://github.com/nvm-sh/nvm) or distro package |
| libmpv | `sudo apt install libmpv2` (Debian/Ubuntu) / `sudo pacman -S mpv` (Arch) / `sudo dnf install mpv-libs` (Fedora) |

#### 1. Backend

```bash
cd music-streaming

# Create a virtual environment (recommended)
python -m venv .venv && source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure (optional — edit with your own keys if you want scrobbling/AI/etc.)
cp .env.example .env

# Start the backend
uvicorn app.main:app --reload
```

The backend will be running at `http://127.0.0.1:8000`.

#### 2. Frontend

Open a second terminal:

```bash
cd music-streaming/frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Open http://localhost:1420 in your browser — it connects to the backend automatically.

#### 3. (Optional) Native desktop app

If you want a native window instead of a browser tab, you need Rust and Tauri's system dependencies:

```bash
# Install Rust (if not already)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Tauri system deps (Ubuntu/Debian)
sudo apt install libwebkit2gtk-4.1-dev build-essential \
  libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev

# Run as a native desktop app
cd music-streaming/frontend
npm run tauri dev
```

---

## Project Structure

```
music-streaming/
│
├── app/                          # Python FastAPI backend
│   ├── main.py                   # App entry, CORS, lifespan
│   ├── config.py                 # pydantic-settings (all API keys)
│   ├── database.py               # SQLite via aiosqlite
│   ├── http_client.py            # Shared httpx.AsyncClient
│   └── routers/
│       ├── innertube.py          # Module 1: YouTube Music / InnerTube
│       ├── playback.py           # Module 2: mpv playback engine + queue + WS
│       ├── downloads.py          # Module 3: Offline downloads + WS progress
│       ├── lyrics.py             # Module 4: Multi-source lyrics waterfall
│       ├── scrobble.py           # Module 5: Last.fm + ListenBrainz
│       ├── ai.py                 # Module 6: Multi-LLM interface
│       ├── translate.py          # Module 7: Translation
│       └── together.py           # Module 8: Sync rooms
│
├── frontend/                     # Tauri + React + TypeScript + Tailwind
│   ├── src/
│   │   ├── lib/                  # Theme engine, API client, WS hooks, types
│   │   ├── components/           # Sidebar, MiniPlayer, TrackRow, UI primitives
│   │   └── pages/                # Home, Search, Library, Downloads, NowPlaying, Settings
│   ├── src-tauri/                # Rust shell for native Linux binary
│   └── package.json
│
├── tests/                        # Backend integration tests (pytest + respx)
├── assets/                       # Static assets (language list)
├── requirements.txt              # Python dependencies
├── .env.example                  # All configurable API keys/tokens
└── pytest.ini
```

---

## Desktop Client Design

The frontend faithfully matches the source app's **Material 3 / Material You** design:

- **Dynamic color** — entire scheme generated from a single seed color at runtime (HCT algorithm via `@material/material-color-utilities`)
- **Three theme modes** — Light / Dark / AMOLED Pure Black, following system preference
- **Fixed accent palette** — 25 vibrant colors for playlist/avatar fallbacks, assigned deterministically
- **Desktop layout** — left sidebar nav, persistent bottom mini-player, full Now Playing overlay with synced lyrics
- **Material Symbols** (rounded) iconography

### Why Tauri over Electron

| | Tauri | Electron |
|--|-------|----------|
| Binary size | ~5–10 MB | ~100+ MB |
| Idle RAM | ~30–60 MB | ~100–200 MB |
| Runtime | System WebKitGTK | Bundled Chromium |
| Node APIs needed? | No (all logic in Python backend) | No |

The React frontend code is shell-agnostic — it would port to Electron unchanged if you prefer faster iteration at the cost of a larger binary.

---

## Configuration

All API keys are optional. The backend no-ops gracefully (returns "not configured" errors) if a key is missing — nothing crashes. See `.env.example` for the full list of configurable tokens.

---

## Testing

```bash
# Backend tests (26 passing — InnerTube + lyrics waterfall)
pytest -v

# Frontend typecheck + build
cd frontend && npm run build

# Frontend lint
cd frontend && npm run lint
```

---

## Security

- Backend is **localhost-only** by default — never bound to `0.0.0.0`
- CORS allows only `http://localhost:*` and `tauri://localhost`
- No DRM circumvention — errors are surfaced if DRM content is encountered
- All API keys stay in your `.env` and are never logged or exposed
- The frontend stores only UI preferences (theme, sidebar width) in localStorage — nothing sensitive

---

## Optional: LAN Access with Caddy

```
# Caddyfile
archivetune.local {
    tls internal
    reverse_proxy 127.0.0.1:8000
}
```

```bash
sudo caddy run --config Caddyfile
```

---

## License

Personal use.
