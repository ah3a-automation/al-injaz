import type { Header } from '@tanstack/react-table';
import { flexRender } from '@tanstack/react-table';
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';

import { cn } from '@/lib/utils';

interface DataTableHeaderProps<TData> {
  header: Header<TData, unknown>;
}

export function DataTableHeader<TData>({ header }: DataTableHeaderProps<TData>) {
  const canSort = header.column.getCanSort();
  const isSorted = header.column.getIsSorted();
  const handler = header.column.getToggleSortingHandler();

  return (
    <th
      className={cn(
        'p-3 text-start font-medium',
        canSort && 'cursor-pointer select-none hover:bg-muted/70'
      )}
      colSpan={header.colSpan}
      onClick={canSort ? handler : undefined}
      onKeyDown={
        canSort && handler
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handler(e);
              }
            }
          : undefined
      }
      role={canSort ? 'columnheader' : undefined}
      tabIndex={canSort ? 0 : undefined}
      aria-sort={
        isSorted === 'asc'
          ? 'ascending'
          : isSorted === 'desc'
            ? 'descending'
            : undefined
      }
    >
      <div className="flex items-center gap-1">
        {flexRender(header.column.columnDef.header, header.getContext())}
        {canSort && (
          <span className="inline-flex shrink-0" aria-hidden>
            {isSorted === 'asc' && <ChevronUp className="h-4 w-4" />}
            {isSorted === 'desc' && <ChevronDown className="h-4 w-4" />}
            {!isSorted && <ChevronsUpDown className="h-4 w-4 opacity-50" />}
          </span>
        )}
      </div>
    </th>
  );
}
