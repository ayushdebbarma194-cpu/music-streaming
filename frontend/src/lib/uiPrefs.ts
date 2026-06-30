/**
 * Persistence for pure UI preferences only (theme seed, theme mode, sidebar
 * width, backend URL override, last-selected search tab). These have no
 * backend equivalent, so localStorage is appropriate here. Anything the
 * backend owns (queue, downloads) is NEVER mirrored here.
 */

import { DEFAULT_SEED, type ThemeMode } from "./theme";

const KEYS = {
  seed: "at:seedColor",
  mode: "at:themeMode",
  sidebarWidth: "at:sidebarWidth",
  sidebarCollapsed: "at:sidebarCollapsed",
  backendUrl: "at:backendUrl",
  searchTab: "at:searchTab",
  aiProvider: "at:aiProvider",
} as const;

/** Theme mode preference includes "system" which resolves at runtime. */
export type ModePreference = ThemeMode | "system";

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}

export const uiPrefs = {
  getSeed(): string {
    return read(KEYS.seed) ?? DEFAULT_SEED;
  },
  setSeed(hex: string): void {
    write(KEYS.seed, hex);
  },

  getModePreference(): ModePreference {
    const v = read(KEYS.mode);
    if (v === "light" || v === "dark" || v === "pureBlack" || v === "system") {
      return v;
    }
    return "system";
  },
  setModePreference(mode: ModePreference): void {
    write(KEYS.mode, mode);
  },

  getSidebarWidth(): number {
    const v = read(KEYS.sidebarWidth);
    const n = v ? parseInt(v, 10) : NaN;
    return Number.isFinite(n) ? n : 256;
  },
  setSidebarWidth(px: number): void {
    write(KEYS.sidebarWidth, String(px));
  },

  getSidebarCollapsed(): boolean {
    return read(KEYS.sidebarCollapsed) === "true";
  },
  setSidebarCollapsed(collapsed: boolean): void {
    write(KEYS.sidebarCollapsed, String(collapsed));
  },

  getBackendUrl(): string {
    return (
      read(KEYS.backendUrl) ??
      import.meta.env.VITE_BACKEND_URL ??
      "http://localhost:8000"
    );
  },
  setBackendUrl(url: string): void {
    write(KEYS.backendUrl, url);
  },

  getSearchTab(): string {
    return read(KEYS.searchTab) ?? "songs";
  },
  setSearchTab(tab: string): void {
    write(KEYS.searchTab, tab);
  },

  getAiProvider(): string {
    return read(KEYS.aiProvider) ?? "claude";
  },
  setAiProvider(provider: string): void {
    write(KEYS.aiProvider, provider);
  },
};
