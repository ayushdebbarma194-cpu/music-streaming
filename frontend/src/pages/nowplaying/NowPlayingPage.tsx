/**
 * Now Playing (full view) — overlay above the app shell with large album art,
 * synced lyrics (line-by-line highlight against live playback position), a
 * queue side panel, and an AI "translate lyrics" action.
 */

import { useEffect, useRef, useState } from "react";
import { usePlayback } from "@/lib/PlaybackProvider";
import { useLyrics, formatTime } from "@/lib/hooks";
import { Artwork } from "@/components/ui/Artwork";
import { IconButton } from "@/components/ui/IconButton";
import { Slider } from "@/components/ui/Slider";
import { Icon } from "@/components/ui/Icon";
import { SyncedLyrics } from "./SyncedLyrics";
import { QueuePanel } from "./QueuePanel";
import { TranslateLyricsButton } from "./TranslateLyricsButton";

interface NowPlayingPageProps {
  onClose: () => void;
}

type Tab = "lyrics" | "queue";

export function NowPlayingPage({ onClose }: NowPlayingPageProps) {
  const {
    state,
    buffering,
    togglePlayPause,
    seek,
    setVolume,
    optimisticPosition,
    setOptimisticPosition,
  } = usePlayback();
  const [tab, setTab] = useState<Tab>("lyrics");
  const [translated, setTranslated] = useState<string[] | null>(null);

  const track = state?.current_track;
  const duration = state?.duration ?? 0;

  const lyrics = useLyrics({
    video_id: track?.video_id ?? undefined,
    title: track?.title ?? undefined,
    artist: track?.artist ?? undefined,
  });

  // Reset any translation when the track changes.
  useEffect(() => {
    setTranslated(null);
  }, [track?.video_id]);

  // Smooth local position ticker for lyric sync between socket pushes.
  const [tickPosition, setTickPosition] = useState(0);
  const lastSyncRef = useRef<{ pos: number; at: number }>({ pos: 0, at: Date.now() });
  useEffect(() => {
    if (state) {
      lastSyncRef.current = { pos: state.position, at: Date.now() };
      setTickPosition(state.position);
    }
  }, [state?.position, state?.current_track?.video_id, state]);
  useEffect(() => {
    if (!state?.is_playing) return;
    const id = setInterval(() => {
      const elapsed = (Date.now() - lastSyncRef.current.at) / 1000;
      setTickPosition(
        Math.min(lastSyncRef.current.pos + elapsed, state.duration || Infinity),
      );
    }, 200);
    return () => clearInterval(id);
  }, [state?.is_playing, state?.duration, state]);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const displayPosition = optimisticPosition ?? tickPosition;
  const trackKey = track?.title || track?.video_id || "untitled";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Now playing"
      className="fixed inset-0 z-50 flex flex-col bg-background"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4">
        <IconButton icon="expand_more" label="Close now playing" onClick={onClose} />
        <span className="text-label-lg text-on-surface-variant">Now Playing</span>
        <div className="w-10" />
      </div>

      <div className="flex min-h-0 flex-1 gap-6 px-6 pb-6">
        {/* Left: art + transport */}
        <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-6">
          <Artwork
            src={null}
            seedKey={trackKey}
            alt={track?.title ?? "No track"}
            rounded="rounded-m3-xl"
            className="aspect-square w-full max-w-md shadow-sm"
          />
          <div className="w-full max-w-md text-center">
            <h1 className="truncate text-headline-sm text-on-surface">
              {track?.title ?? "Nothing playing"}
            </h1>
            <p className="truncate text-title-md text-on-surface-variant">
              {track?.artist ?? ""}
            </p>
          </div>

          <div className="w-full max-w-md">
            <Slider
              label="Seek"
              min={0}
              max={Math.max(duration, 1)}
              step={1}
              value={Math.min(displayPosition, duration || 1)}
              onChange={(v) => setOptimisticPosition(v)}
              onChangeCommitted={(v) => void seek(v)}
              disabled={duration <= 0}
            />
            <div className="mt-1 flex justify-between text-label-sm tabular-nums text-on-surface-variant">
              <span>{formatTime(displayPosition)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <IconButton icon="shuffle" label="Shuffle" iconSize={22} disabled />
            <IconButton icon="skip_previous" label="Previous" iconSize={28} disabled />
            <IconButton
              icon={buffering ? "hourglass_empty" : state?.is_playing ? "pause" : "play_arrow"}
              filled
              label={state?.is_playing ? "Pause" : "Play"}
              variant="filled"
              iconSize={32}
              className="h-16 w-16"
              onClick={() => void togglePlayPause()}
            />
            <IconButton icon="skip_next" label="Next" iconSize={28} disabled />
            <IconButton icon="repeat" label="Repeat" iconSize={22} disabled />
          </div>

          <div className="flex w-full max-w-md items-center gap-2">
            <Icon name="volume_down" className="text-on-surface-variant" size={20} />
            <Slider
              label="Volume"
              className="flex-1"
              min={0}
              max={100}
              value={state?.volume ?? 100}
              onChange={(v) => void setVolume(v)}
            />
            <Icon name="volume_up" className="text-on-surface-variant" size={20} />
          </div>
        </div>

        {/* Right: lyrics / queue panel */}
        <div className="flex w-[420px] shrink-0 flex-col rounded-m3-xl bg-surface-container p-4">
          <div className="mb-3 flex items-center justify-between">
            <div role="tablist" aria-label="Panel" className="flex gap-1">
              <button
                role="tab"
                aria-selected={tab === "lyrics"}
                onClick={() => setTab("lyrics")}
                className={`rounded-full px-4 py-1.5 text-label-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  tab === "lyrics"
                    ? "bg-secondary-container text-on-secondary-container"
                    : "text-on-surface-variant hover:bg-on-surface/8"
                }`}
              >
                Lyrics
              </button>
              <button
                role="tab"
                aria-selected={tab === "queue"}
                onClick={() => setTab("queue")}
                className={`rounded-full px-4 py-1.5 text-label-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  tab === "queue"
                    ? "bg-secondary-container text-on-secondary-container"
                    : "text-on-surface-variant hover:bg-on-surface/8"
                }`}
              >
                Queue
              </button>
            </div>
            {tab === "lyrics" && lyrics.data?.lines && lyrics.data.lines.length > 0 && (
              <TranslateLyricsButton
                lines={lyrics.data.lines}
                onTranslated={setTranslated}
              />
            )}
          </div>

          <div className="min-h-0 flex-1">
            {tab === "lyrics" ? (
              <SyncedLyrics
                lyrics={lyrics.data}
                isLoading={lyrics.isLoading}
                positionSeconds={displayPosition}
                onSeek={(s) => void seek(s)}
                translatedLines={translated}
              />
            ) : (
              <QueuePanel />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
