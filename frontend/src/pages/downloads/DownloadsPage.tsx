/**
 * Downloads — lists GET /api/downloads with live progress patched in by the
 * app-wide /ws/downloads socket. Per-item cancel/delete.
 */

import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { Icon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";
import { Artwork } from "@/components/ui/Artwork";
import { useDeleteDownload, useDownloads } from "@/lib/hooks";
import { usePlayback } from "@/lib/PlaybackProvider";
import type { DownloadItem } from "@/lib/types";

function stateLabel(d: DownloadItem): string {
  switch (d.state_name) {
    case "queued":
      return "Queued";
    case "downloading":
      return `Downloading • ${Math.round(d.percent_downloaded)}%`;
    case "completed":
      return "Downloaded";
    case "failed":
      return "Failed";
    case "removing":
      return "Removing…";
    default:
      return d.state_name;
  }
}

export function DownloadsPage() {
  const { data, isLoading, isError } = useDownloads();
  const del = useDeleteDownload();
  const { playVideo } = usePlayback();

  const downloads = data?.downloads ?? [];

  return (
    <div className="mx-auto max-w-3xl p-6">
      <PageHeader
        title="Downloads"
        subtitle="Offline tracks cached by the backend"
      />

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner size={32} />
        </div>
      )}

      {isError && (
        <EmptyState
          icon="error"
          title="Couldn't load downloads"
          description="Check the backend is running and reachable."
        />
      )}

      {!isLoading && !isError && downloads.length === 0 && (
        <EmptyState
          icon="download_done"
          title="No downloads yet"
          description="Download a track from search or now-playing to make it available offline."
        />
      )}

      <ul className="flex flex-col gap-2">
        {downloads.map((d) => {
          const completed = d.state_name === "completed";
          const failed = d.state_name === "failed";
          return (
            <li
              key={d.id}
              className="flex items-center gap-3 rounded-m3-md bg-surface-container px-3 py-3"
            >
              <Artwork
                src={null}
                seedKey={d.id}
                alt="Download"
                className="h-12 w-12 shrink-0"
                iconName="audio_file"
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-body-lg text-on-surface">{d.id}</div>
                <div
                  className={`truncate text-body-sm ${
                    failed ? "text-error" : "text-on-surface-variant"
                  }`}
                >
                  {stateLabel(d)}
                </div>
                {d.state_name === "downloading" && (
                  <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-surface-variant">
                    <div
                      className="h-full rounded-full bg-primary transition-[width] duration-300 ease-m3-standard"
                      style={{ width: `${Math.min(100, d.percent_downloaded)}%` }}
                    />
                  </div>
                )}
              </div>

              {completed && (
                <IconButton
                  icon="play_arrow"
                  filled
                  label="Play offline file"
                  variant="tonal"
                  iconSize={20}
                  onClick={() => void playVideo(d.id)}
                />
              )}
              {!completed && !failed && (
                <Icon name="downloading" className="text-on-surface-variant" />
              )}
              <IconButton
                icon="delete"
                label="Delete download"
                iconSize={20}
                onClick={() => del.mutate(d.id)}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
