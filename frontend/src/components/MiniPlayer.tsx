/**
 * Persistent bottom playback bar (mini-player) — always visible, exactly like
 * the source app. Shows artwork, title/artist, scrubber, transport controls,
 * and volume. Clicking the track info expands the full Now Playing view.
 *
 * This is a remote control: every control calls /api/playback/* and the bar
 * reflects state pushed over the playback WebSocket.
 */

import { useNavigate } from "react-router-dom";
import { usePlayback } from "@/lib/PlaybackProvider";
import { formatTime } from "@/lib/hooks";
import { Artwork } from "./ui/Artwork";
import { IconButton } from "./ui/IconButton";
import { Icon } from "./ui/Icon";
import { Slider } from "./ui/Slider";
import { useEffect, useRef, useState } from "react";

export function MiniPlayer() {
  const navigate = useNavigate();
  const {
    state,
    buffering,
    socketStatus,
    togglePlayPause,
    seek,
    setVolume,
    optimisticPosition,
    setOptimisticPosition,
  } = usePlayback();

  // Smoothly advance the scrubber between socket pushes using a local ticker.
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
    }, 250);
    return () => clearInterval(id);
  }, [state?.is_playing, state?.duration, state]);

  const track = state?.current_track;
  const duration = state?.duration ?? 0;
  const displayPosition = optimisticPosition ?? tickPosition;
  const trackKey = track?.title || track?.video_id || "untitled";
  const hasTrack = Boolean(track?.title || track?.video_id);

  return (
    <footer className="px-3 pb-3">
      <div className="flex items-center gap-4 rounded-m3-xl bg-surface-container-high px-4 py-3">
        {/* Track info — click to expand full Now Playing */}
        <button
          type="button"
          onClick={() => hasTrack && navigate("/now-playing")}
          disabled={!hasTrack}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-m3-md p-1 text-left transition-colors hover:bg-on-surface/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none"
          aria-label="Open now playing"
        >
          <Artwork
            src={null}
            seedKey={trackKey}
            alt={track?.title ?? "No track"}
            className="h-14 w-14 shrink-0"
          />
          <div className="min-w-0">
            <div className="truncate text-title-sm text-on-surface">
              {track?.title ?? "Nothing playing"}
            </div>
            <div className="truncate text-body-sm text-on-surface-variant">
              {track?.artist ?? (socketStatus === "open" ? "Pick a song to start" : "Connecting…")}
            </div>
          </div>
        </button>

        {/* Transport + scrubber */}
        <div className="flex flex-[2] flex-col items-center gap-1">
          <div className="flex items-center gap-1">
            <IconButton icon="skip_previous" label="Previous" iconSize={22} disabled />
            <IconButton
              icon={buffering ? "hourglass_empty" : state?.is_playing ? "pause" : "play_arrow"}
              filled
              label={state?.is_playing ? "Pause" : "Play"}
              variant="filled"
              onClick={() => void togglePlayPause()}
              disabled={!hasTrack}
            />
            <IconButton icon="skip_next" label="Next" iconSize={22} disabled />
          </div>
          <div className="flex w-full items-center gap-2">
            <span className="w-10 text-right text-label-sm tabular-nums text-on-surface-variant">
              {formatTime(displayPosition)}
            </span>
            <Slider
              label="Seek"
              className="flex-1"
              min={0}
              max={Math.max(duration, 1)}
              step={1}
              value={Math.min(displayPosition, duration || 1)}
              onChange={(v) => setOptimisticPosition(v)}
              onChangeCommitted={(v) => void seek(v)}
              disabled={!hasTrack || duration <= 0}
            />
            <span className="w-10 text-label-sm tabular-nums text-on-surface-variant">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Volume */}
        <div className="flex flex-1 items-center justify-end gap-2">
          <Icon
            name={
              (state?.volume ?? 100) === 0
                ? "volume_off"
                : (state?.volume ?? 100) < 50
                  ? "volume_down"
                  : "volume_up"
            }
            className="text-on-surface-variant"
            size={22}
          />
          <Slider
            label="Volume"
            className="w-28"
            min={0}
            max={100}
            step={1}
            value={state?.volume ?? 100}
            onChange={(v) => void setVolume(v)}
          />
        </div>
      </div>
    </footer>
  );
}
