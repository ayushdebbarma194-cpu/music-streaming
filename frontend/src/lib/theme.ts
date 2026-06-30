/**
 * Material You dynamic color engine.
 *
 * Generates a full Material 3 color scheme at runtime from a single seed hex
 * color using Google's @material/material-color-utilities (the same HCT
 * algorithm the source app's `materialkolor` library wraps). The generated
 * scheme is applied as CSS custom properties consumed by Tailwind.
 *
 * Supports three modes: light, dark, and a true AMOLED "pure black" variant
 * (surface = #000000), matching the source app's `pureBlack` flag.
 */

import {
  argbFromHex,
  hexFromArgb,
  Hct,
  SchemeTonalSpot,
  MaterialDynamicColors,
  type DynamicScheme,
} from "@material/material-color-utilities";

export type ThemeMode = "light" | "dark" | "pureBlack";

/** Deep purple/violet default seed, matching the source app accent palette. */
export const DEFAULT_SEED = "#7D3C98";

/**
 * Maps Material Dynamic Color roles to our CSS variable names.
 * Each entry resolves an ARGB int from the scheme.
 */
const COLOR_ROLES: Record<string, (s: DynamicScheme) => number> = {
  "--md-primary": (s) => MaterialDynamicColors.primary.getArgb(s),
  "--md-on-primary": (s) => MaterialDynamicColors.onPrimary.getArgb(s),
  "--md-primary-container": (s) => MaterialDynamicColors.primaryContainer.getArgb(s),
  "--md-on-primary-container": (s) => MaterialDynamicColors.onPrimaryContainer.getArgb(s),
  "--md-secondary": (s) => MaterialDynamicColors.secondary.getArgb(s),
  "--md-on-secondary": (s) => MaterialDynamicColors.onSecondary.getArgb(s),
  "--md-secondary-container": (s) => MaterialDynamicColors.secondaryContainer.getArgb(s),
  "--md-on-secondary-container": (s) => MaterialDynamicColors.onSecondaryContainer.getArgb(s),
  "--md-tertiary": (s) => MaterialDynamicColors.tertiary.getArgb(s),
  "--md-on-tertiary": (s) => MaterialDynamicColors.onTertiary.getArgb(s),
  "--md-tertiary-container": (s) => MaterialDynamicColors.tertiaryContainer.getArgb(s),
  "--md-on-tertiary-container": (s) => MaterialDynamicColors.onTertiaryContainer.getArgb(s),
  "--md-error": (s) => MaterialDynamicColors.error.getArgb(s),
  "--md-on-error": (s) => MaterialDynamicColors.onError.getArgb(s),
  "--md-error-container": (s) => MaterialDynamicColors.errorContainer.getArgb(s),
  "--md-on-error-container": (s) => MaterialDynamicColors.onErrorContainer.getArgb(s),
  "--md-background": (s) => MaterialDynamicColors.background.getArgb(s),
  "--md-on-background": (s) => MaterialDynamicColors.onBackground.getArgb(s),
  "--md-surface": (s) => MaterialDynamicColors.surface.getArgb(s),
  "--md-on-surface": (s) => MaterialDynamicColors.onSurface.getArgb(s),
  "--md-surface-variant": (s) => MaterialDynamicColors.surfaceVariant.getArgb(s),
  "--md-on-surface-variant": (s) => MaterialDynamicColors.onSurfaceVariant.getArgb(s),
  "--md-outline": (s) => MaterialDynamicColors.outline.getArgb(s),
  "--md-outline-variant": (s) => MaterialDynamicColors.outlineVariant.getArgb(s),
  "--md-surface-container-lowest": (s) => MaterialDynamicColors.surfaceContainerLowest.getArgb(s),
  "--md-surface-container-low": (s) => MaterialDynamicColors.surfaceContainerLow.getArgb(s),
  "--md-surface-container": (s) => MaterialDynamicColors.surfaceContainer.getArgb(s),
  "--md-surface-container-high": (s) => MaterialDynamicColors.surfaceContainerHigh.getArgb(s),
  "--md-surface-container-highest": (s) => MaterialDynamicColors.surfaceContainerHighest.getArgb(s),
  "--md-inverse-surface": (s) => MaterialDynamicColors.inverseSurface.getArgb(s),
  "--md-inverse-on-surface": (s) => MaterialDynamicColors.inverseOnSurface.getArgb(s),
};

/** Pure-black overrides applied on top of the dark scheme for AMOLED mode. */
const PURE_BLACK_OVERRIDES: Record<string, string> = {
  "--md-background": "0 0 0",
  "--md-surface": "0 0 0",
  "--md-surface-container-lowest": "0 0 0",
  "--md-surface-container-low": "10 10 10",
  "--md-surface-container": "16 16 16",
  "--md-surface-container-high": "24 24 24",
  "--md-surface-container-highest": "32 32 32",
};

/** Convert an ARGB int to an "R G B" string for use in rgb(var(--x) / a). */
function argbToRgbTriplet(argb: number): string {
  const hex = hexFromArgb(argb).replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
}

export interface GeneratedScheme {
  /** CSS variable name -> "R G B" triplet string */
  variables: Record<string, string>;
  /** Whether this scheme should apply the `dark` class for Tailwind */
  isDark: boolean;
}

/**
 * Generate a full Material 3 scheme from a seed color for a given mode.
 */
export function generateScheme(seedHex: string, mode: ThemeMode): GeneratedScheme {
  const isDark = mode === "dark" || mode === "pureBlack";
  let sourceArgb: number;
  try {
    sourceArgb = argbFromHex(seedHex);
  } catch {
    sourceArgb = argbFromHex(DEFAULT_SEED);
  }

  const hct = Hct.fromInt(sourceArgb);
  // contrastLevel 0 = default M3 contrast, matching Compose defaults.
  const scheme = new SchemeTonalSpot(hct, isDark, 0);

  const variables: Record<string, string> = {};
  for (const [cssVar, resolve] of Object.entries(COLOR_ROLES)) {
    variables[cssVar] = argbToRgbTriplet(resolve(scheme));
  }

  if (mode === "pureBlack") {
    Object.assign(variables, PURE_BLACK_OVERRIDES);
  }

  return { variables, isDark };
}

/**
 * Apply a generated scheme to the document root by setting CSS variables
 * and toggling the `dark` class for Tailwind's dark: variants.
 */
export function applyScheme(scheme: GeneratedScheme): void {
  const root = document.documentElement;
  for (const [cssVar, value] of Object.entries(scheme.variables)) {
    root.style.setProperty(cssVar, value);
  }
  root.classList.toggle("dark", scheme.isDark);
}

/** Resolve the effective mode when the user picks "system". */
export function resolveSystemMode(): "light" | "dark" {
  if (typeof window === "undefined" || !window.matchMedia) return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
