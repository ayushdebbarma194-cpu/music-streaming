/**
 * Typed API client for the ArchiveTune backend.
 *
 * The base URL is resolved at call time from uiPrefs so a user-supplied
 * backend URL override (Settings) takes effect without a reload. The frontend
 * is a remote control: it never decodes/streams audio itself — it only calls
 * /api/playback/* and reflects state pushed over WebSocket.
 */

import { uiPrefs } from "./uiPrefs";
import type {
  AiProvider,
  AiProvidersResponse,
  CurateResponse,
  DownloadsResponse,
  LyricsResponse,
  PlaybackState,
  QueueResponse,
  SearchResponse,
  SearchType,
  SongMetadata,
  TranslateLyricsResponse,
  TranslateResponse,
} from "./types";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function baseUrl(): string {
  return uiPrefs.getBackendUrl().replace(/\/+$/, "");
}

/** Convert the configured http(s) base URL into a ws(s) origin. */
export function wsBaseUrl(): string {
  return baseUrl().replace(/^http/, "ws");
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${baseUrl()}${path}`;
  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
    });
  } catch (err) {
    throw new ApiError(0, `Network error: ${(err as Error).message}`);
  }

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body?.detail ?? detail;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, detail);
  }

  // Some endpoints (204) have no body.
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

function qs(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") search.set(k, String(v));
  }
  const s = search.toString();
  return s ? `?${s}` : "";
}

export const api = {
  // ─── Catalog ──────────────────────────────────────────────
  search(q: string, type?: SearchType, limit = 20): Promise<SearchResponse> {
    return request<SearchResponse>(`/api/search${qs({ q, type, limit })}`);
  },
  getSong(videoId: string): Promise<SongMetadata> {
    return request<SongMetadata>(`/api/song/${encodeURIComponent(videoId)}`);
  },
  getSongLyrics(videoId: string): Promise<LyricsResponse> {
    return request<LyricsResponse>(
      `/api/song/${encodeURIComponent(videoId)}/lyrics`,
    );
  },
  getPlaylist(playlistId: string): Promise<unknown> {
    return request(`/api/playlist/${encodeURIComponent(playlistId)}`);
  },
  getArtist(artistId: string): Promise<unknown> {
    return request(`/api/artist/${encodeURIComponent(artistId)}`);
  },
  getAlbum(albumId: string): Promise<unknown> {
    return request(`/api/album/${encodeURIComponent(albumId)}`);
  },

  // ─── Playback (remote control only) ───────────────────────
  play(body: { video_id: string } | { stream_url: string }): Promise<unknown> {
    return request(`/api/playback/play`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  pause(): Promise<unknown> {
    return request(`/api/playback/pause`, { method: "POST" });
  },
  resume(): Promise<unknown> {
    return request(`/api/playback/resume`, { method: "POST" });
  },
  seek(positionSeconds: number): Promise<unknown> {
    return request(`/api/playback/seek`, {
      method: "POST",
      body: JSON.stringify({ position_seconds: positionSeconds }),
    });
  },
  setVolume(level: number): Promise<unknown> {
    return request(`/api/playback/volume`, {
      method: "POST",
      body: JSON.stringify({ level }),
    });
  },
  getPlaybackState(): Promise<PlaybackState> {
    return request<PlaybackState>(`/api/playback/state`);
  },

  // ─── Queue ────────────────────────────────────────────────
  getQueue(): Promise<QueueResponse> {
    return request<QueueResponse>(`/api/queue`);
  },
  queueAdd(body: {
    video_id?: string;
    stream_url?: string;
    title?: string;
    artist?: string;
  }): Promise<unknown> {
    return request(`/api/queue/add`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  queueRemove(index: number): Promise<unknown> {
    return request(`/api/queue/${index}`, { method: "DELETE" });
  },
  queueReorder(fromIndex: number, toIndex: number): Promise<unknown> {
    return request(`/api/queue/reorder`, {
      method: "POST",
      body: JSON.stringify({ from_index: fromIndex, to_index: toIndex }),
    });
  },

  // ─── Downloads ────────────────────────────────────────────
  startDownload(videoId: string): Promise<unknown> {
    return request(`/api/downloads`, {
      method: "POST",
      body: JSON.stringify({ video_id: videoId }),
    });
  },
  listDownloads(): Promise<DownloadsResponse> {
    return request<DownloadsResponse>(`/api/downloads`);
  },
  deleteDownload(id: string): Promise<unknown> {
    return request(`/api/downloads/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },

  // ─── Lyrics ───────────────────────────────────────────────
  getLyrics(params: {
    title?: string;
    artist?: string;
    video_id?: string;
  }): Promise<LyricsResponse> {
    return request<LyricsResponse>(`/api/lyrics${qs(params)}`);
  },

  // ─── AI ───────────────────────────────────────────────────
  aiProviders(): Promise<AiProvidersResponse> {
    return request<AiProvidersResponse>(`/api/ai/providers`);
  },
  aiCurate(prompt: string, provider: AiProvider): Promise<CurateResponse> {
    return request<CurateResponse>(`/api/ai/curate`, {
      method: "POST",
      body: JSON.stringify({ prompt, provider }),
    });
  },
  aiTranslateLyrics(
    lyrics: string,
    targetLanguage: string,
    provider: AiProvider,
  ): Promise<TranslateLyricsResponse> {
    return request<TranslateLyricsResponse>(`/api/ai/translate-lyrics`, {
      method: "POST",
      body: JSON.stringify({
        lyrics,
        target_language: targetLanguage,
        provider,
      }),
    });
  },

  // ─── Translation ──────────────────────────────────────────
  translate(text: string, target: string): Promise<TranslateResponse> {
    return request<TranslateResponse>(`/api/translate${qs({ text, target })}`);
  },
};
