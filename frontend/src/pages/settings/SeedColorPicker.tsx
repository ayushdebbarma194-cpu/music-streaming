/**
 * Seed color picker. Dragging the native color input live-previews the
 * regenerated Material You scheme (previewSeed); releasing commits it
 * (setSeed). Also offers quick swatches from the app's accent palette,
 * including the deep-purple defaults.
 */

import { useTheme } from "@/lib/ThemeProvider";
import { ACCENT_PALETTE } from "@/lib/accentPalette";
import { DEFAULT_SEED } from "@/lib/theme";
import { Icon } from "@/components/ui/Icon";

// A curated subset of the accent palette for quick swatches.
const QUICK_SWATCHES = [
  "#7D3C98",
  "#8E44AD",
  "#3498DB",
  "#2A9D8F",
  "#E63946",
  "#E76F51",
  "#F4A261",
  "#52B788",
];

export function SeedColorPicker() {
  const { seed, setSeed, previewSeed, cancelPreview } = useTheme();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <label className="relative inline-flex h-16 w-16 cursor-pointer items-center justify-center overflow-hidden rounded-m3-md border border-outline-variant">
          <span
            className="absolute inset-0"
            style={{ backgroundColor: seed }}
            aria-hidden
          />
          <input
            type="color"
            value={seed}
            aria-label="Seed color"
            className="absolute inset-0 cursor-pointer opacity-0"
            onInput={(e) => previewSeed((e.target as HTMLInputElement).value)}
            onChange={(e) => setSeed(e.target.value)}
            onBlur={cancelPreview}
          />
        </label>
        <div>
          <div className="font-mono text-body-lg uppercase text-on-surface">
            {seed}
          </div>
          <button
            type="button"
            onClick={() => setSeed(DEFAULT_SEED)}
            className="mt-1 inline-flex items-center gap-1 text-label-md text-primary hover:underline"
          >
            <Icon name="restart_alt" size={16} />
            Reset to default
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {QUICK_SWATCHES.map((hex) => (
          <button
            key={hex}
            type="button"
            aria-label={`Use seed ${hex}`}
            onClick={() => setSeed(hex)}
            onMouseEnter={() => previewSeed(hex)}
            onMouseLeave={cancelPreview}
            className={`h-9 w-9 rounded-full border-2 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              seed.toUpperCase() === hex ? "border-on-surface" : "border-transparent"
            }`}
            style={{ backgroundColor: hex }}
          />
        ))}
      </div>

      {/* Live preview of generated roles */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {(
          [
            ["Primary", "bg-primary"],
            ["Secondary", "bg-secondary"],
            ["Tertiary", "bg-tertiary"],
            ["Container", "bg-primary-container"],
            ["Surface", "bg-surface-container-high"],
            ["Error", "bg-error"],
          ] as const
        ).map(([label, cls]) => (
          <div key={label} className="flex flex-col items-center gap-1">
            <div
              className={`h-10 w-full rounded-m3-sm border border-outline-variant ${cls}`}
            />
            <span className="text-label-sm text-on-surface-variant">{label}</span>
          </div>
        ))}
      </div>

      <p className="text-body-sm text-on-surface-variant">
        Full palette has {ACCENT_PALETTE.length} fixed accent colors used for
        playlist and avatar fallbacks, independent of this theme.
      </p>
    </div>
  );
}
