import type { ReactNode } from "react";
import { Icon } from "./Icon";

interface EmptyStateProps {
  icon: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

/** Centered placeholder for empty/error/loading-resolved states. */
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-container text-on-surface-variant">
        <Icon name={icon} size={32} />
      </div>
      <div>
        <p className="text-title-md text-on-surface">{title}</p>
        {description && (
          <p className="mt-1 max-w-sm text-body-md text-on-surface-variant">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
