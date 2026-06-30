# ArchiveTune — Linux Desktop Client

A native-feeling Linux desktop music player UI for the self-hosted
[ArchiveTune backend](../README.md) (FastAPI + WebSocket). Built as a **Tauri**
app (Rust shell + web frontend) using **React + TypeScript + Tailwind CSS**.

The frontend is a thin, fast UI shell and **remote control + visualizer** — all
playback, streaming, downloads, lyrics, and AI logic live in the Python backend.
This app only ever talks to the backend's REST/WebSocket API and reflects the
state it pushes.

## Why Tauri (and the Electron tradeoff)

This is a **Tauri** app: smaller binary, lower idle memory footprint, and no
need for Node APIs client-side since all logic lives in the backend.

> **If you'd rather use Electron** for faster iteration, that's an acceptable
> substitution — but note the tradeoff: a significantly **larger binary**
> (~100 MB+ vs Tauri's few MB) and **higher idle RAM** (Electron bundles its own
> Chromium; Tauri uses the system WebKitGTK on Linux). The React frontend code
> here is shell-agnostic and would port to Electron unchanged.

## Design language

Faithfully matches the source app's Material 3 / Material You language:

- **Dynamic color** — the entire scheme is generated at runtime from a single
  seed color via [`@material/material-color-utilities`](https://www.npmjs.com/package/@material/material-color-utilities)
  (the same HCT algorithm the source app's `materialkolor` wraps). No hardcoded
  palette. Default seed is a deep purple (`#7D3C98`).
- **Three theme modes** — Light / Dark / true AMOLED **Pure Black**
  (`surface = #000000`), following the OS preference by default with manual
  override.
- **Fixed accent palette** — a 25-color vibrant palette (extracted from the APK)
  is used for playlist/avatar fallbacks, assigned deterministically by hashing
  the item name, independent of the dynamic theme.
- **Typography** — system-native sans stack (Inter / Cantarell / `system-ui`) at
  the Material 3 type scale.
- **Shape & elevation** — large soft corner radii and tonal surface layering
  (not box-shadow stacking).
- **Iconography** — Material Symbols (rounded).

## Layout

- **Left sidebar** for primary navigation (Home, Search, Library, Downloads,
  Settings) — the desktop adaptation of the source app's mobile bottom nav.
- **Persistent bottom mini-player** — always visible, with artwork, title/artist,
  scrubber, transport controls, and volume.
- **Full Now Playing view** — opens over the shell with large art, synced lyrics
  (line-by-line highlight against live playback position), a queue panel, and an
  AI "translate lyrics" action.

## Prerequisites

- **Node.js 18+** and npm
- For building the native binary: **Rust** + Tauri's Linux system dependencies
  (`webkit2gtk`, `libappindicator`, etc.). See the
  [Tauri Linux setup guide](https://tauri.app/start/prerequisites/).
- The **ArchiveTune backend** running (default `http://localhost:8000`).

## Getting started

```bash
cd frontend
npm install

# Web dev server (fast iteration in a browser at http://localhost:1420)
npm run dev

# Full native desktop app (requires Rust + Tauri system deps)
npm run tauri dev

# Production builds
npm run build          # web assets -> dist/
npm run tauri build    # native Linux binary
```

If your backend runs on a non-default host/port, set it in **Settings → Backend**
(persisted locally), or provide `VITE_BACKEND_URL` at build time.

## Architecture

```
src/
├── main.tsx                  # Provider tree: QueryClient > Theme > Playback > Router
├── App.tsx                   # Shell: sidebar + content + mini-player + NowPlaying overlay
├── styles/index.css          # Tailwind + Material Symbols + CSS-variable theme
├── lib/
│   ├── theme.ts              # Material You scheme generation (HCT) -> CSS vars
│   ├── ThemeProvider.tsx     # Seed + mode state, live preview, system-pref following
│   ├── accentPalette.ts      # Fixed 25-color palette + deterministic hashing
│   ├── uiPrefs.ts            # localStorage for UI-only prefs (never backend state)
│   ├── api.ts                # Typed REST client (base URL resolved at call time)
│   ├── types.ts              # API contract types
│   ├── queryClient.ts        # TanStack Query client
│   ├── hooks.ts              # Query/mutation hooks + utilities
│   ├── useReconnectingSocket.ts  # Generic auto-reconnecting WS hook
│   ├── PlaybackProvider.tsx  # usePlaybackSocket equivalent — the app's spine
│   └── useDownloadsSocket.ts # Live download progress -> query cache
├── components/
│   ├── Sidebar.tsx
│   ├── MiniPlayer.tsx
│   ├── TrackRow.tsx
│   └── ui/                   # Shared primitives (Icon, IconButton, Slider, Artwork…)
└── pages/
    ├── home/                 # Home + AI "for you"
    ├── search/               # Debounced, tabbed, virtualized search
    ├── library/              # Saved playlists/albums (mock until backend endpoint)
    ├── downloads/            # Live download progress
    ├── nowplaying/           # Full view: synced lyrics + queue + translate
    └── settings/             # Seed picker, theme toggle, AI provider, backend URL
```

## Engineering conventions

- **TypeScript strict mode** is on.
- **Server state** lives entirely in TanStack Query — nothing the backend owns is
  duplicated into a separate client store. Local UI-only state uses `useState`.
- **No `localStorage`** for backend-owned data (queue, downloads) to avoid drift;
  it's used only for pure UI prefs (theme, sidebar, backend URL, last tab).
- **Accessibility** — interactive controls are keyboard-reachable; the scrubber
  and volume slider are arrow-key operable; the lyrics highlight respects
  `prefers-reduced-motion`.
- **Performance** — long lists (search results, library, queue) are virtualized
  with `@tanstack/react-virtual`.

## Notes / TODOs

- The **Library** page uses mock data (`// TODO: backend endpoint pending`) until
  a `/api/library/*` set of endpoints exists in the backend contract.
- The `<audio>` tag is intentionally **not** used for the main player — the
  backend's `mpv` instance is the real audio engine.
