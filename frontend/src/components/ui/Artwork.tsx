/**
 * Album/track artwork with a deterministic accent-color fallback (matching
 * how the source app colors playlist art placeholders and avatar fallbacks).
 */

import { useState } from "react";
import { accentColorFor, readableTextColor } from "@/lib/accentPalette";
import { Icon } from "./Icon";

interface ArtworkProps {
  src?: string | null;
  /** Stable key (title/artist/id) used to pick the fallback color. */
  seedKey: string;
  alt?: string;
  className?: string;
  rounded?: string;
  iconName?: string;
}

export function Artwork({
  src,
  seedKey,
  alt = "",
  className = "",
  rounded = "rounded-m3-md",
  iconName = "music_note",
}: ArtworkProps) {
  const [errored, setErrored] = useState(false);
  const showFallback = !src || errored;

  if (showFallback) {
    const bg = accentColorFor(seedKey);
    const fg = readableTextColor(bg);
    const letter = seedKey.trim().charAt(0).toUpperCase();
    return (
      <div
        className={`flex items-center justify-center overflow-hidden ${rounded} ${className}`}
        style={{ backgroundColor: bg, color: fg }}
        aria-label={alt}
        role="img"
      >
        {letter ? (
          <span className="font-medium" style={{ fontSize: "45%" }}>
            {letter}
          </span>
        ) : (
          <Icon name={iconName} />
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setErrored(true)}
      className={`object-cover ${rounded} ${className}`}
    />
  );
}
