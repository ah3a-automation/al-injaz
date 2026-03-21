import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
  type VisibilityState,
  type RowSelectionState,
} from '@tanstack/react-table';
import { Inbox } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';

import { Checkbox } from '@/Components/ui/checkbox';
import { DataTableBulkActions } from './DataTableBulkActions';
import { DataTableHeader } from './DataTableHeader';
import { DataTablePagination } from './DataTablePagination';
import { DataTableToolbar } from './DataTableToolbar';

export interface DataTableProps<TData extends { id: string | number }, TValue = unknown> {
  tableKey: string;
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  pagination: {
    total: number;
    current_page: number;
    per_page: number;
    last_page: number;
  };
  onSortChange?: (field: string, dir: 'asc' | 'desc') => void;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
  onBulkAction?: (action: string, selectedIds: string[]) => void;
  bulkActions?: Array<{
    label: string;
    action: string;
    variant?: 'default' | 'destructive';
  }>;
  exportRouteName?: string;
  extraFilters?: React.ReactNode;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  loading?: boolean;
  emptyMessage?: string;
  /** Shown below empty message (e.g. “Clear filters” when filters exclude all rows). */
  emptyStateExtra?: React.ReactNode;
  /** When set, replaces default pagination summary (e.g. entity-specific “suppliers”). */
  paginationSummarySlot?: React.ReactNode;
  currentFilters?: Record<string, unknown>;
}

const STORAGE_KEY_PREFIX = 'datatable_columns_';

export function DataTable<TData extends { id: string | number }, TValue = unknown>({
  tableKey,
  columns: propColumns,
  data,
  pagination,
  onSortChange,
  onPageChange,
  onPerPageChange,
  onBulkAction,
  bulkActions = [],
  exportRouteName,
  extraFilters,
  searchValue = '',
  onSearchChange,
  loading = false,
  emptyMessage = 'No results found.',
  currentFilters,
}: DataTableProps<TData, TValue>) {
  const stored = typeof window !== 'undefined' ? localStorage.getItem(`${STORAGE_KEY_PREFIX}${tableKey}`) : null;
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    stored ? (JSON.parse(stored) as VisibilityState) : {}
  );
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [sorting, setSorting] = useState<SortingState>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(
      `${STORAGE_KEY_PREFIX}${tableKey}`,
      JSON.stringify(columnVisibility)
    );
  }, [columnVisibility, tableKey]);

  const selectColumn: ColumnDef<TData, TValue> = useMemo(
    () => ({
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value: boolean | 'indeterminate') => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value: boolean | 'indeterminate') => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    }),
    []
  );

  const columns = useMemo(
    () => [selectColumn, ...propColumns],
    [selectColumn, propColumns]
  );

  const table = useReactTable({
    data,
    columns,
    state: {
      rowSelection,
      columnVisibility,
      sorting,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater;
      setSorting(next);
      if (next.length > 0 && onSortChange) {
        const first = next[0];
        onSortChange(first.id, first.desc ? 'desc' : 'asc');
      }
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    manualSorting: true,
    pageCount: pagination.last_page,
    getRowId: (row) => String(row.id),
  });

  const selectedIds = table
    .getSelectedRowModel()
    .rows.map((r) => String(r.original.id));

  const clearSelection = () => table.resetRowSelection();

  return (
    <div className="space-y-4">
      <DataTableToolbar
        table={table}
        tableKey={tableKey}
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        extraFilters={extraFilters}
        exportRouteName={exportRouteName}
        currentFilters={currentFilters}
      />

      {selectedIds.length > 0 && bulkActions.length > 0 && onBulkAction && (
        <DataTableBulkActions
          selectedCount={selectedIds.length}
          selectedIds={selectedIds}
          actions={bulkActions}
          onAction={onBulkAction}
          onClearSelection={clearSelection}
        />
      )}

      <div className="overflow-hidden rounded-xl border border-border-soft bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-border-soft bg-surface text-text-main font-semibold">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <DataTableHeader key={header.id} header={header} />
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr
                  key={i}
                  className="bg-white"
                  {...(i === 0
                    ? { role: 'status' as const, 'aria-live': 'polite' as const, 'aria-busy': true as const }
                    : {})}
                >
                  {columns.map((_, j) => (
                    <td key={j} className="p-3">
                      <div className="h-4 animate-pulse rounded bg-muted" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="p-8 text-center text-text-muted"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Inbox className="h-10 w-10 opacity-50" aria-hidden />
                    <p>{emptyMessage}</p>
                    {emptyStateExtra ? (
                      <div className="mt-2 flex flex-col items-center gap-2">{emptyStateExtra}</div>
                    ) : null}
                  </div>
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={`border-t border-border-soft bg-white hover:bg-brand-gold100 ${
                    row.getIsSelected()
                      ? 'border-s-2 border-brand-gold bg-brand-gold100'
                      : ''
                  }`}
                  data-state={row.getIsSelected() ? 'selected' : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="p-3 text-text-main">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination.total > 0 && (
        <DataTablePagination
          pagination={pagination}
          onPageChange={onPageChange}
          onPerPageChange={onPerPageChange}
          summarySlot={paginationSummarySlot}
        />
      )}
    </div>
  );
}
