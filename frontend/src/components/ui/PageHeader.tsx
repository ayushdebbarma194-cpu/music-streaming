import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <header className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h1 className="text-headline-md text-on-surface">{title}</h1>
        {subtitle && (
          <p className="mt-1 text-body-md text-on-surface-variant">{subtitle}</p>
        )}
      </div>
      {action}
    </header>
  );
}
