/**
 * PlaybackProvider: the spine of the app. Opens the /ws/playback WebSocket,
 * holds the live playback state pushed by the backend, and exposes transport
 * controls that call /api/playback/*. The frontend never owns playback state
 * locally beyond mirroring what the socket pushes.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import { wsBaseUrl } from "./api";
import { useReconnectingSocket, type SocketStatus } from "./useReconnectingSocket";
import type { PlaybackSocketMessage, PlaybackState } from "./types";

interface PlaybackContextValue {
  state: PlaybackState | null;
  buffering: boolean;
  socketStatus: SocketStatus;
  playVideo: (videoId: string, meta?: { title?: string; artist?: string }) => Promise<void>;
  togglePlayPause: () => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  seek: (positionSeconds: number) => Promise<void>;
  setVolume: (level: number) => Promise<void>;
  /** Optimistic local position override for smooth scrubbing. */
  optimisticPosition: number | null;
  setOptimisticPosition: (pos: number | null) => void;
}

const PlaybackContext = createContext<PlaybackContextValue | null>(null);

export function PlaybackProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<PlaybackState | null>(null);
  const [buffering, setBuffering] = useState(false);
  const [optimisticPosition, setOptimisticPosition] = useState<number | null>(null);

  const handleMessage = useCallback((msg: PlaybackSocketMessage) => {
    if (msg.type === "state_update") {
      setState(msg.data);
      setBuffering(Boolean(msg.data.buffering));
      // A live state push means any optimistic scrub should yield to truth.
      setOptimisticPosition(null);
    }
  }, []);

  const socketStatus = useReconnectingSocket<PlaybackSocketMessage>({
    url: `${wsBaseUrl()}/ws/playback`,
    onMessage: handleMessage,
  });

  const refreshState = useCallback(async () => {
    try {
      setState(await api.getPlaybackState());
    } catch {
      /* socket will catch up */
    }
  }, []);

  const playVideo = useCallback(
    async (videoId: string, meta?: { title?: string; artist?: string }) => {
      await api.play({ video_id: videoId });
      // Optimistically reflect the requested track until the socket pushes.
      setState((prev) => ({
        is_playing: true,
        position: 0,
        duration: prev?.duration ?? 0,
        volume: prev?.volume ?? 100,
        current_track: {
          video_id: videoId,
          title: meta?.title ?? null,
          artist: meta?.artist ?? null,
        },
      }));
      await refreshState();
      void queryClient.invalidateQueries({ queryKey: ["queue"] });
    },
    [refreshState, queryClient],
  );

  const pause = useCallback(async () => {
    await api.pause();
    setState((prev) => (prev ? { ...prev, is_playing: false } : prev));
  }, []);

  const resume = useCallback(async () => {
    await api.resume();
    setState((prev) => (prev ? { ...prev, is_playing: true } : prev));
  }, []);

  const togglePlayPause = useCallback(async () => {
    if (state?.is_playing) {
      await pause();
    } else {
      await resume();
    }
  }, [state?.is_playing, pause, resume]);

  const seek = useCallback(async (positionSeconds: number) => {
    setOptimisticPosition(positionSeconds);
    await api.seek(positionSeconds);
  }, []);

  const setVolume = useCallback(async (level: number) => {
    setState((prev) => (prev ? { ...prev, volume: level } : prev));
    await api.setVolume(level);
  }, []);

  const value = useMemo<PlaybackContextValue>(
    () => ({
      state,
      buffering,
      socketStatus,
      playVideo,
      togglePlayPause,
      pause,
      resume,
      seek,
      setVolume,
      optimisticPosition,
      setOptimisticPosition,
    }),
    [
      state,
      buffering,
      socketStatus,
      playVideo,
      togglePlayPause,
      pause,
      resume,
      seek,
      setVolume,
      optimisticPosition,
    ],
  );

  return (
    <PlaybackContext.Provider value={value}>{children}</PlaybackContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePlayback(): PlaybackContextValue {
  const ctx = useContext(PlaybackContext);
  if (!ctx) throw new Error("usePlayback must be used within PlaybackProvider");
  return ctx;
}
