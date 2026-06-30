export function Spinner({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`inline-block animate-spin rounded-full border-2 border-on-surface-variant/30 border-t-primary ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
