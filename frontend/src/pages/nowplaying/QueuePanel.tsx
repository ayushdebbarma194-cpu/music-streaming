/**
 * Queue side panel for the Now Playing view. Reads GET /api/queue, supports
 * remove and reorder (move up/down) against the backend queue endpoints.
 */

import { useQueue, useQueueRemove } from "@/lib/hooks";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Artwork } from "@/components/ui/Artwork";
import { IconButton } from "@/components/ui/IconButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";

export function QueuePanel() {
  const { data, isLoading } = useQueue();
  const remove = useQueueRemove();
  const qc = useQueryClient();

  const reorder = useMutation({
    mutationFn: ({ from, to }: { from: number; to: number }) =>
      api.queueReorder(from, to),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["queue"] }),
  });

  const items = data?.queue ?? [];

  return (
    <div className="flex h-full flex-col">
      <h2 className="mb-3 px-1 text-title-md text-on-surface">Queue</h2>

      {isLoading && (
        <div className="flex justify-center py-8">
          <Spinner size={24} />
        </div>
      )}

      {!isLoading && items.length === 0 && (
        <EmptyState
          icon="queue_music"
          title="Queue is empty"
          description="Add songs from search or a track's menu."
        />
      )}

      <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto">
        {items.map((item) => (
          <li
            key={item.index}
            className={`group flex items-center gap-3 rounded-m3-md px-2 py-2 transition-colors hover:bg-on-surface/8 ${
              item.is_current ? "bg-secondary-container/40" : ""
            }`}
          >
            <Artwork
              src={null}
              seedKey={item.title || String(item.index)}
              alt={item.title ?? "Track"}
              className="h-10 w-10 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div
                className={`truncate text-body-md ${
                  item.is_current ? "text-primary" : "text-on-surface"
                }`}
              >
                {item.title ?? item.video_id ?? "Unknown"}
              </div>
              {item.artist && (
                <div className="truncate text-body-sm text-on-surface-variant">
                  {item.artist}
                </div>
              )}
            </div>
            <div className="flex items-center opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
              <IconButton
                icon="keyboard_arrow_up"
                label="Move up"
                iconSize={18}
                disabled={item.index === 0}
                onClick={() =>
                  reorder.mutate({ from: item.index, to: item.index - 1 })
                }
              />
              <IconButton
                icon="keyboard_arrow_down"
                label="Move down"
                iconSize={18}
                disabled={item.index === items.length - 1}
                onClick={() =>
                  reorder.mutate({ from: item.index, to: item.index + 1 })
                }
              />
              <IconButton
                icon="close"
                label="Remove from queue"
                iconSize={18}
                onClick={() => remove.mutate(item.index)}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
