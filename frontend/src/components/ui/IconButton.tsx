import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Icon } from "./Icon";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: string;
  filled?: boolean;
  iconSize?: number;
  /** Visual emphasis variant. */
  variant?: "standard" | "filled" | "tonal";
  label: string;
}

/**
 * Round Material 3 icon button with state-layer hover/focus and keyboard
 * reachability. `label` is required for accessibility.
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    { icon, filled, iconSize = 24, variant = "standard", label, className = "", ...props },
    ref,
  ) {
    const variants: Record<string, string> = {
      standard:
        "text-on-surface-variant hover:bg-on-surface/8 hover:text-on-surface",
      filled: "bg-primary text-on-primary hover:opacity-90",
      tonal:
        "bg-secondary-container text-on-secondary-container hover:opacity-90",
    };
    return (
      <button
        ref={ref}
        type="button"
        aria-label={label}
        title={label}
        className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors duration-150 ease-m3-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-40 disabled:pointer-events-none ${variants[variant]} ${className}`}
        {...props}
      >
        <Icon name={icon} filled={filled} size={iconSize} />
      </button>
    );
  },
);
