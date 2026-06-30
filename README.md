# ArchiveTune Backend Service

A standalone Python FastAPI backend service that replicates the network/playback logic of the [ArchiveTune](https://github.com/koiverse/ArchiveTune) Android music app. Designed to run natively on Linux for personal use, exposing clean REST/WebSocket endpoints consumed by a desktop frontend over localhost.

## Features

- **Music Source (InnerTube)** — Search YouTube Music catalog, resolve playable stream URLs, browse playlists/artists/albums
- **Audio Playback** — Full mpv-based audio engine with play/pause/seek/volume/queue via REST + real-time WebSocket state updates
- **Offline Downloads** — Download tracks for offline playback with progress tracking
- **Lyrics Waterfall** — Multi-source lyrics fetching (Kugou → SimpMusic → YouTube captions) with SQLite caching
- **Scrobbling** — Last.fm (Audioscrobbler 2.0) and ListenBrainz integration with automatic scrobble threshold detection
- **AI Features** — Multi-provider LLM interface (Claude, OpenAI, Gemini, OpenRouter) for music curation and lyrics translation
- **Translation** — Text translation via Google Translate (official API or googletrans fallback)
- **Together Mode** — WebSocket rooms for synchronized multi-device playback

## Prerequisites

### System Dependencies

```bash
# Ubuntu/Debian
sudo apt install libmpv2

# Arch Linux
sudo pacman -S mpv

# Fedora
sudo dnf install mpv-libs
```

### Python 3.11+

The service requires Python 3.11 or newer.

## Installation

```bash
# Clone the repo
git clone <repo-url>
cd music-streaming

# Create virtual environment
python -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy and configure environment
cp .env.example .env
# Edit .env with your API keys (all integrations safely no-op if keys are missing)
```

## Running

```bash
# Development (with auto-reload)
uvicorn app.main:app --reload

# Production
uvicorn app.main:app --host 127.0.0.1 --port 8000

# Or via Python directly
python -m app.main
```

The API will be available at `http://127.0.0.1:8000`.

Interactive API docs: `http://127.0.0.1:8000/docs`

## Configuration

All configuration is done via environment variables (`.env` file). See `.env.example` for the full list.

| Variable | Required | Description |
|----------|----------|-------------|
| `LASTFM_API_KEY` | No | Last.fm API key for scrobbling |
| `LASTFM_API_SECRET` | No | Last.fm API secret |
| `LASTFM_USERNAME` | No | Last.fm username |
| `LASTFM_PASSWORD` | No | Last.fm password |
| `LISTENBRAINZ_TOKEN` | No | ListenBrainz user token |
| `ANTHROPIC_API_KEY` | No | Anthropic Claude API key |
| `OPENAI_API_KEY` | No | OpenAI API key |
| `GEMINI_API_KEY` | No | Google Gemini API key |
| `OPENROUTER_API_KEY` | No | OpenRouter API key |
| `GCP_TRANSLATION_API_KEY` | No | Google Cloud Translation key |
| `DOWNLOAD_DIR` | No | Download directory (default: `./downloads`) |

**Note:** All integrations safely return "not configured" errors if their keys are missing — nothing crashes.

## API Overview

### Music Source
- `GET /api/search?q=&type=songs|albums|artists|playlists` — Search catalog
- `GET /api/song/{video_id}` — Metadata + resolved stream URL
- `GET /api/song/{video_id}/lyrics` — Song lyrics
- `GET /api/playlist/{playlist_id}` — Playlist details
- `GET /api/artist/{artist_id}` — Artist info
- `GET /api/album/{album_id}` — Album details

### Playback
- `POST /api/playback/play` — Start playback (`{video_id}` or `{stream_url}`)
- `POST /api/playback/pause` — Pause
- `POST /api/playback/resume` — Resume
- `POST /api/playback/seek` — Seek (`{position_seconds}`)
- `POST /api/playback/volume` — Set volume (`{level: 0-100}`)
- `GET /api/playback/state` — Current state
- `WS /ws/playback` — Real-time playback state updates

### Queue
- `POST /api/queue/add` — Add to queue
- `DELETE /api/queue/{index}` — Remove from queue
- `GET /api/queue` — Get queue
- `POST /api/queue/reorder` — Reorder queue

### Downloads
- `POST /api/downloads` — Start download (`{video_id}`)
- `GET /api/downloads` — List all downloads
- `DELETE /api/downloads/{id}` — Remove download
- `GET /api/downloads/{id}/file` — Serve cached file
- `WS /ws/downloads` — Real-time progress

### Lyrics
- `GET /api/lyrics?title=&artist=&video_id=` — Fetch lyrics (waterfall)

### Scrobbling
- `POST /api/scrobble/nowplaying` — Now playing
- `POST /api/scrobble/submit` — Submit scrobble

### AI Features
- `POST /api/ai/curate` — AI music curation
- `POST /api/ai/translate-lyrics` — AI lyrics translation
- `GET /api/ai/providers` — List configured providers

### Translation
- `GET /api/translate?text=&target=` — Translate text
- `GET /api/translate/languages` — Language list

### Together Mode
- `WS /ws/together/{room_code}` — Synchronized playback room

## Testing

```bash
# Run all tests
pytest

# Run with verbose output
pytest -v

# Run specific test module
pytest tests/test_innertube.py
pytest tests/test_lyrics.py
```

## Optional: Reverse Proxy with Caddy

If you want to access this from another device on your LAN with TLS:

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

## Architecture

```
app/
├── __init__.py
├── main.py              # FastAPI app, CORS, lifespan
├── config.py            # pydantic-settings configuration
├── database.py          # SQLite (aiosqlite) setup
├── http_client.py       # Shared httpx.AsyncClient
└── routers/
    ├── innertube.py     # Module 1: YouTube Music/InnerTube
    ├── playback.py      # Module 2: mpv playback engine
    ├── downloads.py     # Module 3: Offline downloads
    ├── lyrics.py        # Module 4: Lyrics waterfall
    ├── scrobble.py      # Module 5: Last.fm + ListenBrainz
    ├── ai.py            # Module 6: Multi-LLM interface
    ├── translate.py     # Module 7: Translation
    └── together.py      # Module 8: Sync rooms
assets/
    └── translator_languages.json  # 133 languages for picker
tests/
    ├── conftest.py
    ├── test_innertube.py
    └── test_lyrics.py
```

## Security Notes

- This backend is **localhost-only** by default — never bind to `0.0.0.0` unless you understand the implications
- CORS only allows `http://localhost:*` and `tauri://localhost`
- No DRM circumvention — if a DRM-protected response is encountered, an error is surfaced
- All API keys stay in your `.env` file and are never logged or exposed

## License

Personal use.
