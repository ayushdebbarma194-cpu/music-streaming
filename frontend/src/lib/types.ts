/**
 * Shared types for the ArchiveTune backend API contract.
 * Kept intentionally permissive where the backend response shape is rich
 * (search results, artist/album payloads) since those mirror ytmusicapi.
 */

export type SearchType = "songs" | "albums" | "artists" | "playlists";

export interface Thumbnail {
  url: string;
  width?: number;
  height?: number;
}

export interface ArtistRef {
  name: string;
  id?: string | null;
}

export interface SearchResultItem {
  category?: string;
  resultType?: string;
  title?: string;
  name?: string;
  videoId?: string;
  browseId?: string;
  playlistId?: string;
  artists?: ArtistRef[];
  album?: { name?: string; id?: string };
  duration?: string;
  duration_seconds?: number;
  thumbnails?: Thumbnail[];
  year?: string;
  [key: string]: unknown;
}

export interface SearchResponse {
  query: string;
  type: string | null;
  results: SearchResultItem[];
}

export interface SongMetadata {
  video_id: string;
  title: string | null;
  artist: string | null;
  duration_seconds: number;
  thumbnail: string | null;
  is_live: boolean;
  stream_url: string;
  mime_type: string | null;
  bitrate: number | null;
  itag: number | null;
  expires_at: number;
  cached: boolean;
}

export interface CurrentTrack {
  video_id?: string | null;
  stream_url?: string | null;
  title?: string | null;
  artist?: string | null;
}

export interface PlaybackState {
  is_playing: boolean;
  position: number;
  duration: number;
  volume: number;
  current_track: CurrentTrack | null;
  queue_length?: number;
  queue_index?: number;
}

/** WebSocket push payload from /ws/playback */
export interface PlaybackSocketMessage {
  type: "state_update";
  data: PlaybackState & { buffering?: boolean };
}

export interface QueueItem {
  index: number;
  video_id?: string | null;
  stream_url?: string | null;
  title?: string | null;
  artist?: string | null;
  is_current: boolean;
}

export interface QueueResponse {
  queue: QueueItem[];
}

export type DownloadStateName =
  | "queued"
  | "downloading"
  | "completed"
  | "failed"
  | "removing"
  | "unknown";

export interface DownloadItem {
  id: string;
  mime_type: string | null;
  uri: string;
  file_path: string;
  state: number;
  state_name: DownloadStateName;
  start_time_ms: number;
  update_time_ms: number;
  content_length: number;
  percent_downloaded: number;
  bytes_downloaded: number;
}

export interface DownloadsResponse {
  downloads: DownloadItem[];
  count: number;
}

/** WebSocket push payload from /ws/downloads */
export interface DownloadSocketMessage {
  type: "download_progress";
  data: {
    id: string;
    state: number;
    state_name: DownloadStateName;
    percent_downloaded: number;
    bytes_downloaded: number;
    error?: string;
  };
}

export interface LyricLine {
  time_ms: number | null;
  text: string;
}

export interface LyricsResponse {
  source: string | null;
  synced: boolean;
  lines: LyricLine[];
  plain_text?: string | null;
  cached?: boolean;
  error?: string;
}

export type AiProvider = "claude" | "openai" | "gemini" | "openrouter";

export interface AiProviderInfo {
  id: AiProvider;
  name: string;
  available: boolean;
}

export interface AiProvidersResponse {
  providers: AiProviderInfo[];
  message?: string;
}

export interface CurateResponse {
  provider: string;
  response: string;
}

export interface TranslateLyricsResponse {
  provider: string;
  target_language: string;
  translated_lyrics: string;
}

export interface TranslateResponse {
  translated_text: string;
  detected_source_language: string;
  target_language: string;
  provider: string;
}
