/**
 * Three-way theme toggle: Light / Dark / Pure Black, plus a "System" option
 * that follows the OS color-scheme. Default is System with manual override.
 */

import { useTheme } from "@/lib/ThemeProvider";
import { Icon } from "@/components/ui/Icon";
import type { ModePreference } from "@/lib/uiPrefs";

const OPTIONS: { id: ModePreference; label: string; icon: string }[] = [
  { id: "system", label: "System", icon: "brightness_auto" },
  { id: "light", label: "Light", icon: "light_mode" },
  { id: "dark", label: "Dark", icon: "dark_mode" },
  { id: "pureBlack", label: "Pure Black", icon: "contrast" },
];

export function ThemeModeToggle() {
  const { modePreference, setModePreference } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Theme mode"
      className="grid grid-cols-2 gap-2 sm:grid-cols-4"
    >
      {OPTIONS.map((opt) => {
        const active = modePreference === opt.id;
        return (
          <button
            key={opt.id}
            role="radio"
            aria-checked={active}
            onClick={() => setModePreference(opt.id)}
            className={`flex flex-col items-center gap-2 rounded-m3-md border px-3 py-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              active
                ? "border-primary bg-primary-container text-on-primary-container"
                : "border-outline-variant text-on-surface-variant hover:bg-on-surface/8"
            }`}
          >
            <Icon name={opt.icon} filled={active} size={24} />
            <span className="text-label-md">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
