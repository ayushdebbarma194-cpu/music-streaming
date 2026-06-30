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

### 1. Start the backend

```bash
# Install Python dependencies
cd music-streaming
pip install -r requirements.txt

# Configure API keys (all optional — services gracefully no-op if missing)
cp .env.example .env
# Edit .env with your Last.fm, ListenBrainz, AI provider keys, etc.

# Requires libmpv for audio playback
sudo apt install libmpv2   # Ubuntu/Debian
# sudo pacman -S mpv       # Arch
# sudo dnf install mpv-libs # Fedora

# Run the backend
uvicorn app.main:app --reload
```

The API will be at `http://127.0.0.1:8000` — interactive docs at `/docs`.

### 2. Start the desktop client

```bash
cd frontend
npm install

# Dev server (opens in browser at http://localhost:1420)
npm run dev

# Or native desktop app (requires Rust + Tauri system deps)
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

## Backend API Overview

| Endpoint | Description |
|----------|-------------|
| `GET /api/search?q=&type=` | Search catalog |
| `GET /api/song/{video_id}` | Metadata + resolved stream URL |
| `GET /api/song/{video_id}/lyrics` | Song lyrics (waterfall) |
| `GET /api/playlist/{id}` | Playlist details |
| `GET /api/artist/{id}` | Artist info |
| `GET /api/album/{id}` | Album details |
| `POST /api/playback/play` | Start playback |
| `POST /api/playback/pause` | Pause |
| `POST /api/playback/resume` | Resume |
| `POST /api/playback/seek` | Seek |
| `POST /api/playback/volume` | Set volume |
| `GET /api/playback/state` | Current state |
| `WS /ws/playback` | Real-time playback state pushes |
| `POST /api/queue/add` | Add to queue |
| `GET /api/queue` | View queue |
| `POST /api/downloads` | Start download |
| `GET /api/downloads` | List downloads |
| `WS /ws/downloads` | Live download progress |
| `GET /api/lyrics?title=&artist=` | Fetch lyrics |
| `POST /api/scrobble/nowplaying` | Now playing |
| `POST /api/scrobble/submit` | Submit scrobble |
| `POST /api/ai/curate` | AI curation |
| `POST /api/ai/translate-lyrics` | AI lyrics translation |
| `GET /api/translate?text=&target=` | Text translation |
| `WS /ws/together/{room}` | Synchronized playback room |

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

All API keys are optional. The backend no-ops gracefully (returns "not configured" errors) if a key is missing — nothing crashes.

| Key | Service | Where to get it |
|-----|---------|-----------------|
| `LASTFM_API_KEY` / `_SECRET` | Last.fm scrobbling | [last.fm/api](https://www.last.fm/api/account/create) |
| `LISTENBRAINZ_TOKEN` | ListenBrainz | [listenbrainz.org/settings](https://listenbrainz.org/settings/) |
| `ANTHROPIC_API_KEY` | Claude AI | [console.anthropic.com](https://console.anthropic.com/) |
| `OPENAI_API_KEY` | OpenAI | [platform.openai.com](https://platform.openai.com/api-keys) |
| `GEMINI_API_KEY` | Google Gemini | [aistudio.google.com](https://aistudio.google.com/apikey) |
| `OPENROUTER_API_KEY` | OpenRouter | [openrouter.ai/keys](https://openrouter.ai/keys) |
| `GCP_TRANSLATION_API_KEY` | Google Translation | GCP console |

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
