/**
 * Fixed vibrant accent palette extracted from the ArchiveTune APK.
 * Used for genre tags, avatar fallbacks, and playlist accent chips —
 * independent of the dynamic Material You theme.
 *
 * Colors are assigned deterministically by hashing a stable key
 * (playlist/artist name) so the same item always gets the same color.
 */

export const ACCENT_PALETTE: readonly string[] = [
  "#16A085",
  "#1ABC9C",
  "#264653",
  "#2A9D8F",
  "#3498DB",
  "#457B9D",
  "#45B7D1",
  "#4ECDC4",
  "#52B788",
  "#7D3C98",
  "#85C1E2",
  "#8E44AD",
  "#98D8C8",
  "#BB8FCE",
  "#C0392B",
  "#D35400",
  "#E63946",
  "#E76F51",
  "#E9C46A",
  "#F4A261",
  "#F4A6C1",
  "#F7DC6F",
  "#F8B739",
  "#FF6B6B",
  "#FFA07A",
];

/**
 * Stable string hash (FNV-1a 32-bit). Deterministic across sessions/platforms.
 */
function hashString(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    // 32-bit FNV prime multiply
    hash = Math.imul(hash, 0x01000193);
  }
  // Force unsigned 32-bit
  return hash >>> 0;
}

/**
 * Deterministically pick an accent color for a given key.
 * The same key always maps to the same palette entry.
 */
export function accentColorFor(key: string): string {
  if (!key) return ACCENT_PALETTE[0]!;
  const index = hashString(key) % ACCENT_PALETTE.length;
  return ACCENT_PALETTE[index]!;
}

/**
 * Pick a readable text color (black/white) for a given accent background,
 * based on relative luminance.
 */
export function readableTextColor(hex: string): "#000000" | "#FFFFFF" {
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.slice(0, 2), 16) / 255;
  const g = parseInt(normalized.slice(2, 4), 16) / 255;
  const b = parseInt(normalized.slice(4, 6), 16) / 255;
  const toLinear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  const luminance =
    0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  return luminance > 0.5 ? "#000000" : "#FFFFFF";
}
