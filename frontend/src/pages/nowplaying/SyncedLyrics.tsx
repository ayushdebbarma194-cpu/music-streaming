/**
 * Synced lyrics view with line-by-line highlight as playback progresses,
 * matching the source app's dedicated lyrics view. The active line is chosen
 * by comparing the live playback position against each line's time_ms.
 *
 * Respects prefers-reduced-motion (the .lyric-line transition is disabled via
 * CSS under that media query) and auto-scrolls the active line into view.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import type { LyricsResponse } from "@/lib/types";

interface SyncedLyricsProps {
  lyrics?: LyricsResponse;
  isLoading: boolean;
  /** Live playback position in seconds. */
  positionSeconds: number;
  /** Seek when a line is clicked (synced lyrics only). */
  onSeek?: (seconds: number) => void;
  /** Optional translated lines to show beneath each original line. */
  translatedLines?: string[] | null;
}

export function SyncedLyrics({
  lyrics,
  isLoading,
  positionSeconds,
  onSeek,
  translatedLines,
}: SyncedLyricsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLButtonElement>(null);
  const [reducedMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
  );

  const lines = useMemo(() => lyrics?.lines ?? [], [lyrics?.lines]);
  const synced = Boolean(lyrics?.synced) && lines.some((l) => l.time_ms !== null);
  const positionMs = positionSeconds * 1000;

  // Find the index of the current active line for synced lyrics.
  const activeIndex = useMemo(() => {
    if (!synced) return -1;
    let idx = -1;
    for (let i = 0; i < lines.length; i++) {
      const t = lines[i]?.time_ms;
      if (t !== null && t !== undefined && t <= positionMs) {
        idx = i;
      } else if (t !== null && t !== undefined && t > positionMs) {
        break;
      }
    }
    return idx;
  }, [synced, lines, positionMs]);

  // Auto-scroll the active line into view.
  useEffect(() => {
    if (activeIndex < 0 || !activeLineRef.current) return;
    activeLineRef.current.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      block: "center",
    });
  }, [activeIndex, reducedMotion]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner size={28} />
      </div>
    );
  }

  if (!lyrics || (lines.length === 0 && !lyrics.plain_text)) {
    return (
      <EmptyState
        icon="lyrics"
        title="No lyrics found"
        description="None of the lyric sources had a match for this track."
      />
    );
  }

  // Unsynced fallback: plain text block.
  if (!synced) {
    const text =
      lyrics.plain_text ?? lines.map((l) => l.text).join("\n");
    return (
      <div ref={containerRef} className="h-full overflow-y-auto px-2">
        <div className="mb-3 flex items-center gap-2 text-on-surface-variant">
          <Icon name="lyrics" size={18} />
          <span className="text-label-md">
            Unsynced lyrics{lyrics.source ? ` • ${lyrics.source}` : ""}
          </span>
        </div>
        <p className="whitespace-pre-wrap text-title-md leading-loose text-on-surface">
          {text}
        </p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-full overflow-y-auto px-2 py-8">
      <div className="flex flex-col gap-4">
        {lines.map((line, i) => {
          const isActive = i === activeIndex;
          const isPast = i < activeIndex;
          return (
            <button
              key={`${line.time_ms}-${i}`}
              ref={isActive ? activeLineRef : null}
              type="button"
              onClick={() =>
                line.time_ms !== null &&
                onSeek?.(Math.max(0, line.time_ms / 1000))
              }
              className={`lyric-line block text-left text-headline-sm font-semibold leading-snug focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-m3-sm ${
                isActive
                  ? "text-primary"
                  : isPast
                    ? "text-on-surface-variant/50"
                    : "text-on-surface-variant"
              }`}
              style={{
                opacity: isActive ? 1 : isPast ? 0.5 : 0.75,
                transform: isActive ? "scale(1.02)" : "scale(1)",
                transformOrigin: "left center",
              }}
            >
              {line.text}
              {translatedLines?.[i] && (
                <span className="mt-1 block text-title-sm font-normal text-tertiary">
                  {translatedLines[i]}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
