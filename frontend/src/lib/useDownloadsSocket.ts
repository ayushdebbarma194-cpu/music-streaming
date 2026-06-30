/**
 * useDownloadsSocket: subscribes to /ws/downloads and patches the
 * ["downloads"] React Query cache in place as progress arrives, so the
 * Downloads page reflects live percentages without polling.
 */

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { wsBaseUrl } from "./api";
import { useReconnectingSocket, type SocketStatus } from "./useReconnectingSocket";
import type { DownloadSocketMessage, DownloadsResponse } from "./types";

export function useDownloadsSocket(enabled = true): SocketStatus {
  const queryClient = useQueryClient();

  const onMessage = useCallback(
    (msg: DownloadSocketMessage) => {
      if (msg.type !== "download_progress") return;
      const { id, state, state_name, percent_downloaded, bytes_downloaded } =
        msg.data;

      queryClient.setQueryData<DownloadsResponse>(["downloads"], (prev) => {
        if (!prev) return prev;
        let found = false;
        const downloads = prev.downloads.map((d) => {
          if (d.id !== id) return d;
          found = true;
          return {
            ...d,
            state,
            state_name,
            percent_downloaded,
            bytes_downloaded,
          };
        });
        // New download we don't have yet — trigger a refetch instead.
        if (!found) {
          void queryClient.invalidateQueries({ queryKey: ["downloads"] });
          return prev;
        }
        return { ...prev, downloads };
      });

      // When a download completes, ensure the canonical list is fresh.
      if (state_name === "completed" || state_name === "failed") {
        void queryClient.invalidateQueries({ queryKey: ["downloads"] });
      }
    },
    [queryClient],
  );

  return useReconnectingSocket<DownloadSocketMessage>({
    url: `${wsBaseUrl()}/ws/downloads`,
    onMessage,
    enabled,
  });
}
