/**
 * Library — user's saved playlists/albums.
 *
 * TODO: backend endpoint pending — a /api/library/* set of endpoints is not
 * yet in the API contract. We stub with mock data so the UI is complete and
 * unblocked; swap the mock for a useQuery(["library"]) call once the backend
 * exposes it.
 */

import { useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { PageHeader } from "@/components/ui/PageHeader";
import { Artwork } from "@/components/ui/Artwork";
import { Icon } from "@/components/ui/Icon";

interface LibraryItem {
  id: string;
  title: string;
  subtitle: string;
  kind: "playlist" | "album";
}

// TODO: backend endpoint pending — replace with GET /api/library/*
const MOCK_LIBRARY: LibraryItem[] = Array.from({ length: 40 }, (_, i) => ({
  id: `lib-${i}`,
  title:
    [
      "Liked Songs",
      "Discover Weekly",
      "Synthwave Essentials",
      "Acoustic Mornings",
      "Deep Focus",
      "Rainy Day Jazz",
      "Indie Mixtape",
      "Workout Energy",
    ][i % 8] + ` ${Math.floor(i / 8) + 1}`,
  subtitle: i % 2 === 0 ? "Playlist" : "Album",
  kind: i % 2 === 0 ? "playlist" : "album",
}));

type Filter = "all" | "playlist" | "album";

export function LibraryPage() {
  const [filter, setFilter] = useState<Filter>("all");

  const items = useMemo(
    () =>
      filter === "all"
        ? MOCK_LIBRARY
        : MOCK_LIBRARY.filter((i) => i.kind === filter),
    [filter],
  );

  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 8,
  });

  return (
    <div className="mx-auto flex h-full max-w-4xl flex-col p-6">
      <PageHeader
        title="Library"
        subtitle="Your saved playlists and albums"
      />

      <div className="mb-4 flex gap-2">
        {(["all", "playlist", "album"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-2 text-label-lg capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              filter === f
                ? "bg-secondary-container text-on-secondary-container"
                : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
            }`}
          >
            {f === "all" ? "All" : `${f}s`}
          </button>
        ))}
      </div>

      <div ref={parentRef} className="min-h-0 flex-1 overflow-y-auto">
        <div
          style={{ height: rowVirtualizer.getTotalSize(), position: "relative", width: "100%" }}
        >
          {rowVirtualizer.getVirtualItems().map((vRow) => {
            const item = items[vRow.index]!;
            return (
              <div
                key={vRow.key}
                data-index={vRow.index}
                ref={rowVirtualizer.measureElement}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${vRow.start}px)`,
                }}
              >
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-m3-md px-3 py-2 text-left transition-colors hover:bg-on-surface/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <Artwork
                    src={null}
                    seedKey={item.title}
                    alt={item.title}
                    rounded={item.kind === "playlist" ? "rounded-m3-sm" : "rounded-m3-sm"}
                    className="h-14 w-14 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-body-lg text-on-surface">
                      {item.title}
                    </div>
                    <div className="truncate text-body-sm text-on-surface-variant">
                      {item.subtitle}
                    </div>
                  </div>
                  <Icon name="chevron_right" className="text-on-surface-variant" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
