/**
 * Search — debounced search-as-you-type, tabbed results
 * (Songs/Albums/Artists/Playlists), virtualized for long result sets.
 */

import { useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { PageHeader } from "@/components/ui/PageHeader";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { TrackRow } from "@/components/TrackRow";
import { useDebounced, useSearch } from "@/lib/hooks";
import { uiPrefs } from "@/lib/uiPrefs";
import { normalizeTrack, bestThumbnail, artistNames } from "@/lib/normalize";
import { Artwork } from "@/components/ui/Artwork";
import type { SearchResultItem, SearchType } from "@/lib/types";

const TABS: { id: SearchType; label: string }[] = [
  { id: "songs", label: "Songs" },
  { id: "albums", label: "Albums" },
  { id: "artists", label: "Artists" },
  { id: "playlists", label: "Playlists" },
];

export function SearchPage() {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<SearchType>(
    () => uiPrefs.getSearchTab() as SearchType,
  );
  const debouncedQuery = useDebounced(query, 350);
  const { data, isLoading, isError } = useSearch(debouncedQuery, tab);

  const onTabChange = (next: SearchType) => {
    setTab(next);
    uiPrefs.setSearchTab(next);
  };

  const results = data?.results ?? [];

  return (
    <div className="mx-auto flex h-full max-w-4xl flex-col p-6">
      <PageHeader title="Search" />

      <div className="relative mb-4">
        <Icon
          name="search"
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant"
        />
        <input
          autoFocus
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Songs, albums, artists, playlists…"
          aria-label="Search"
          className="w-full rounded-m3-xl bg-surface-container-high py-4 pl-12 pr-4 text-body-lg text-on-surface placeholder:text-on-surface-variant focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
      </div>

      <div role="tablist" aria-label="Result type" className="mb-4 flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => onTabChange(t.id)}
            className={`rounded-full px-4 py-2 text-label-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              tab === t.id
                ? "bg-secondary-container text-on-secondary-container"
                : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1">
        {!debouncedQuery.trim() && (
          <EmptyState
            icon="search"
            title="Search ArchiveTune"
            description="Find songs, albums, artists, and playlists to play or queue."
          />
        )}
        {debouncedQuery.trim() && isLoading && (
          <div className="flex justify-center py-16">
            <Spinner size={32} />
          </div>
        )}
        {debouncedQuery.trim() && isError && (
          <EmptyState
            icon="error"
            title="Search failed"
            description="Couldn't reach the backend. Check it's running and the URL in Settings."
          />
        )}
        {debouncedQuery.trim() && !isLoading && !isError && results.length === 0 && (
          <EmptyState
            icon="sentiment_dissatisfied"
            title="No results"
            description={`Nothing found for "${debouncedQuery}".`}
          />
        )}
        {results.length > 0 && (
          <ResultsList items={results} tab={tab} />
        )}
      </div>
    </div>
  );
}

/** Virtualized list of results, rendering tracks or generic cards by tab. */
function ResultsList({ items, tab }: { items: SearchResultItem[]; tab: SearchType }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64,
    overscan: 8,
  });

  return (
    <div ref={parentRef} className="h-full overflow-y-auto">
      <div
        style={{ height: rowVirtualizer.getTotalSize(), position: "relative", width: "100%" }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const item = items[virtualRow.index]!;
          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={rowVirtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {tab === "songs" ? (
                <SongResult item={item} />
              ) : (
                <GenericResult item={item} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SongResult({ item }: { item: SearchResultItem }) {
  const track = normalizeTrack(item);
  if (!track) return <GenericResult item={item} />;
  return <TrackRow track={track} />;
}

function GenericResult({ item }: { item: SearchResultItem }) {
  const title = item.title ?? item.name ?? "Unknown";
  const subtitle = artistNames(item) || item.resultType || "";
  const thumb = bestThumbnail(item.thumbnails);
  const isArtist = item.resultType === "artist";
  return (
    <div className="flex items-center gap-3 rounded-m3-md px-3 py-2 transition-colors hover:bg-on-surface/8">
      <Artwork
        src={thumb}
        seedKey={title}
        alt={title}
        rounded={isArtist ? "rounded-full" : "rounded-m3-sm"}
        className="h-12 w-12 shrink-0"
      />
      <div className="min-w-0">
        <div className="truncate text-body-lg text-on-surface">{title}</div>
        {subtitle && (
          <div className="truncate text-body-sm capitalize text-on-surface-variant">
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}
