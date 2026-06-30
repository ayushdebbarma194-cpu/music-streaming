/**
 * ThemeProvider: owns the seed color + mode preference, regenerates the
 * Material You scheme reactively whenever either changes, and follows the OS
 * color-scheme by default (with manual override). Exposes a context so the
 * Settings page can drive live previews.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  applyScheme,
  generateScheme,
  resolveSystemMode,
  type ThemeMode,
} from "./theme";
import { uiPrefs, type ModePreference } from "./uiPrefs";

interface ThemeContextValue {
  seed: string;
  modePreference: ModePreference;
  /** The actual mode currently applied (system resolved). */
  effectiveMode: ThemeMode;
  setSeed: (hex: string) => void;
  setModePreference: (mode: ModePreference) => void;
  /** Apply a scheme without persisting — used for live preview while dragging. */
  previewSeed: (hex: string) => void;
  /** Discard any preview and re-apply the persisted seed. */
  cancelPreview: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveEffectiveMode(pref: ModePreference): ThemeMode {
  if (pref === "system") return resolveSystemMode();
  return pref;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [seed, setSeedState] = useState<string>(() => uiPrefs.getSeed());
  const [modePreference, setModePrefState] = useState<ModePreference>(() =>
    uiPrefs.getModePreference(),
  );
  const [previewHex, setPreviewHex] = useState<string | null>(null);

  const effectiveMode = useMemo(
    () => resolveEffectiveMode(modePreference),
    [modePreference],
  );

  // Apply scheme whenever seed (or preview), or effective mode changes.
  useEffect(() => {
    const activeSeed = previewHex ?? seed;
    applyScheme(generateScheme(activeSeed, effectiveMode));
  }, [seed, previewHex, effectiveMode]);

  // Re-apply when OS preference changes, but only while following system.
  useEffect(() => {
    if (modePreference !== "system" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      applyScheme(generateScheme(previewHex ?? seed, resolveSystemMode()));
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [modePreference, seed, previewHex]);

  const setSeed = useCallback((hex: string) => {
    setPreviewHex(null);
    setSeedState(hex);
    uiPrefs.setSeed(hex);
  }, []);

  const setModePreference = useCallback((mode: ModePreference) => {
    setModePrefState(mode);
    uiPrefs.setModePreference(mode);
  }, []);

  const previewSeed = useCallback((hex: string) => {
    setPreviewHex(hex);
  }, []);

  const cancelPreview = useCallback(() => {
    setPreviewHex(null);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      seed,
      modePreference,
      effectiveMode,
      setSeed,
      setModePreference,
      previewSeed,
      cancelPreview,
    }),
    [seed, modePreference, effectiveMode, setSeed, setModePreference, previewSeed, cancelPreview],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
