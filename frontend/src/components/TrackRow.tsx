/**
 * A single clickable track row: click to play, with hover actions to add to
 * queue and download. Used in search results, library, and elsewhere.
 */

import { usePlayback } from "@/lib/PlaybackProvider";
import { useQueueAdd, useStartDownload } from "@/lib/hooks";
import { Artwork } from "./ui/Artwork";
import { IconButton } from "./ui/IconButton";
import type { NormalizedTrack } from "@/lib/normalize";

interface TrackRowProps {
  track: NormalizedTrack;
  index?: number;
}

export function TrackRow({ track, index }: TrackRowProps) {
  const { playVideo, state } = usePlayback();
  const queueAdd = useQueueAdd();
  const startDownload = useStartDownload();

  const isCurrent = state?.current_track?.video_id === track.videoId;

  return (
    <div
      className={`group flex items-center gap-3 rounded-m3-md px-3 py-2 transition-colors hover:bg-on-surface/8 ${
        isCurrent ? "bg-secondary-container/40" : ""
      }`}
    >
      {typeof index === "number" && (
        <span className="w-6 shrink-0 text-right text-body-sm tabular-nums text-on-surface-variant">
          {index + 1}
        </span>
      )}
      <button
        type="button"
        onClick={() =>
          void playVideo(track.videoId, { title: track.title, artist: track.artist })
        }
        className="flex min-w-0 flex-1 items-center gap-3 text-left focus-visible:outline-none"
        aria-label={`Play ${track.title} by ${track.artist}`}
      >
        <Artwork
          src={track.thumbnail}
          seedKey={track.title || track.videoId}
          alt={track.title}
          className="h-12 w-12 shrink-0"
        />
        <div className="min-w-0">
          <div
            className={`truncate text-body-lg ${isCurrent ? "text-primary" : "text-on-surface"}`}
          >
            {track.title}
          </div>
          <div className="truncate text-body-sm text-on-surface-variant">
            {track.artist}
            {track.album ? ` • ${track.album}` : ""}
          </div>
        </div>
      </button>

      {track.duration && (
        <span className="hidden text-body-sm tabular-nums text-on-surface-variant sm:block">
          {track.duration}
        </span>
      )}

      <div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        <IconButton
          icon="playlist_add"
          label="Add to queue"
          iconSize={20}
          onClick={() =>
            queueAdd.mutate({
              video_id: track.videoId,
              title: track.title,
              artist: track.artist,
            })
          }
        />
        <IconButton
          icon="download"
          label="Download"
          iconSize={20}
          onClick={() => startDownload.mutate(track.videoId)}
        />
      </div>
    </div>
  );
}
