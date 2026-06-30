/**
 * Material Symbols (rounded) icon wrapper. Uses the material-symbols webfont
 * to match Compose Material 3's default icon set.
 */

interface IconProps {
  name: string;
  className?: string;
  filled?: boolean;
  /** Optical size in px applied via font-size. */
  size?: number;
  "aria-hidden"?: boolean;
}

export function Icon({
  name,
  className = "",
  filled = false,
  size = 24,
  "aria-hidden": ariaHidden = true,
}: IconProps) {
  return (
    <span
      className={`material-symbols-rounded ${filled ? "filled" : ""} ${className}`}
      style={{ fontSize: size, lineHeight: 1 }}
      aria-hidden={ariaHidden}
    >
      {name}
    </span>
  );
}
