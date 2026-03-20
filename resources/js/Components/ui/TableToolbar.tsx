import * as React from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/Components/ui/input';

export interface TableToolbarProps {
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  filters?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function TableToolbar({
  searchPlaceholder = 'Search…',
  searchValue = '',
  onSearchChange,
  filters,
  actions,
  className,
}: TableToolbarProps) {
  return (
    <div
      className={cn(
        'mb-6 flex flex-wrap items-center justify-between gap-4',
        className
      )}
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-4">
        {onSearchChange != null && (
          <Input
            type="search"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="max-w-xs"
          />
        )}
        {filters}
      </div>
      {actions != null && <div className="shrink-0">{actions}</div>}
    </div>
  );
}
