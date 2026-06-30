/**
 * Shared React Query hooks and small utilities used across pages.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { api } from "./api";
import type { SearchType } from "./types";

/** Debounce any fast-changing value (used for search-as-you-type). */
export function useDebounced<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

export function useSearch(query: string, type: SearchType) {
  return useQuery({
    queryKey: ["search", type, query],
    queryFn: () => api.search(query, type),
    enabled: query.trim().length > 0,
  });
}

export function useDownloads() {
  return useQuery({
    queryKey: ["downloads"],
    queryFn: () => api.listDownloads(),
    refetchInterval: false,
  });
}

export function useQueue() {
  return useQuery({
    queryKey: ["queue"],
    queryFn: () => api.getQueue(),
  });
}

export function useAiProviders() {
  return useQuery({
    queryKey: ["ai", "providers"],
    queryFn: () => api.aiProviders(),
    staleTime: 5 * 60_000,
  });
}

export function useLyrics(params: {
  title?: string;
  artist?: string;
  video_id?: string;
}) {
  const enabled = Boolean(params.title || params.video_id);
  return useQuery({
    queryKey: ["lyrics", params.video_id ?? "", params.title ?? "", params.artist ?? ""],
    queryFn: () => api.getLyrics(params),
    enabled,
  });
}

export function useStartDownload() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (videoId: string) => api.startDownload(videoId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["downloads"] }),
  });
}

export function useDeleteDownload() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteDownload(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["downloads"] }),
  });
}

export function useQueueAdd() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      video_id?: string;
      stream_url?: string;
      title?: string;
      artist?: string;
    }) => api.queueAdd(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["queue"] }),
  });
}

export function useQueueRemove() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (index: number) => api.queueRemove(index),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["queue"] }),
  });
}

/** Format seconds as m:ss (or h:mm:ss). */
export function formatTime(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "0:00";
  const s = Math.floor(totalSeconds % 60);
  const m = Math.floor((totalSeconds / 60) % 60);
  const h = Math.floor(totalSeconds / 3600);
  const ss = String(s).padStart(2, "0");
  if (h > 0) {
    const mm = String(m).padStart(2, "0");
    return `${h}:${mm}:${ss}`;
  }
  return `${m}:${ss}`;
}
