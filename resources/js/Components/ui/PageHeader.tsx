import * as React from 'react';
import { cn } from '@/lib/utils';

export interface PageHeaderProps {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        'mb-6 flex flex-wrap items-center justify-between gap-4',
        className
      )}
    >
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-text-main">
          {title}
        </h1>
        {description != null && (
          <p className="mt-1 text-sm text-text-muted">{description}</p>
        )}
      </div>
      {actions != null && <div className="shrink-0">{actions}</div>}
    </div>
  );
}
