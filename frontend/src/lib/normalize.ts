/**
 * Helpers to normalize the rich ytmusicapi-shaped search/browse payloads into
 * the small shapes the UI rows need.
 */

import type { SearchResultItem, Thumbnail } from "./types";

export interface NormalizedTrack {
  videoId: string;
  title: string;
  artist: string;
  album?: string;
  duration?: string;
  thumbnail?: string;
}

export function bestThumbnail(thumbnails?: Thumbnail[]): string | undefined {
  if (!thumbnails || thumbnails.length === 0) return undefined;
  // Last entry is usually the highest resolution.
  return thumbnails[thumbnails.length - 1]?.url;
}

export function artistNames(item: SearchResultItem): string {
  if (Array.isArray(item.artists) && item.artists.length > 0) {
    return item.artists.map((a) => a.name).filter(Boolean).join(", ");
  }
  return "";
}

export function normalizeTrack(item: SearchResultItem): NormalizedTrack | null {
  const videoId = item.videoId;
  if (!videoId) return null;
  return {
    videoId,
    title: item.title ?? "Unknown title",
    artist: artistNames(item) || "Unknown artist",
    album: item.album?.name,
    duration: item.duration,
    thumbnail: bestThumbnail(item.thumbnails),
  };
}
