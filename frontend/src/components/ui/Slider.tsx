/**
 * Accessible range slider used for the scrubber and volume control.
 * Operable via arrow keys (native range input) with a filled track showing
 * the current value. Built on a styled native input for full a11y support.
 */

import { useId } from "react";

interface SliderProps {
  value: number;
  min?: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  onChangeCommitted?: (value: number) => void;
  label: string;
  className?: string;
  disabled?: boolean;
}

export function Slider({
  value,
  min = 0,
  max,
  step = 1,
  onChange,
  onChangeCommitted,
  label,
  className = "",
  disabled = false,
}: SliderProps) {
  const id = useId();
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;

  return (
    <div className={`group relative flex items-center ${className}`}>
      <div
        className="pointer-events-none absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-primary"
        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
      />
      <input
        id={id}
        type="range"
        className="m3-slider relative z-10 w-full"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerUp={(e) =>
          onChangeCommitted?.(Number((e.target as HTMLInputElement).value))
        }
        onKeyUp={(e) =>
          onChangeCommitted?.(Number((e.target as HTMLInputElement).value))
        }
      />
    </div>
  );
}
