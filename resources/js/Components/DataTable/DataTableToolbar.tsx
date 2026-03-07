import type { Table } from '@tanstack/react-table';
import { Download } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/Components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/Components/ui/dropdown-menu';
import { Input } from '@/Components/ui/input';
import { DataTableColumnToggle } from './DataTableColumnToggle';

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  extraFilters?: React.ReactNode;
  exportRouteName?: string;
  tableKey: string;
  currentFilters?: Record<string, unknown>;
}

export function DataTableToolbar<TData>({
  table,
  searchValue = '',
  onSearchChange,
  extraFilters,
  exportRouteName,
  tableKey,
  currentFilters,
}: DataTableToolbarProps<TData>) {
  const [exportPending, setExportPending] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  async function handleExport(format: 'xlsx' | 'pdf') {
    if (exportPending) return;
    setExportPending(true);

    try {
      const csrfToken = (
        document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement
      )?.content ?? '';

      const res = await fetch('/exports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': csrfToken,
          Accept: 'application/json',
        },
        body: JSON.stringify({
          type: tableKey,
          format,
          filters: currentFilters ?? {},
        }),
        credentials: 'same-origin',
      });

      const data = (await res.json()) as { export_id?: string; error?: string };

      if (!res.ok) {
        toast.error(data.error ?? 'Export failed to start');
        setExportPending(false);
        return;
      }

      toast.info('Export queued — preparing your file...');

      const exportId = data.export_id;
      let attempts = 0;
      const maxAttempts = 40;

      pollRef.current = setInterval(async () => {
        attempts++;
        if (attempts > maxAttempts) {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
          setExportPending(false);
          toast.error('Export timed out');
          return;
        }

        const statusRes = await fetch(`/exports/${exportId}`, {
          credentials: 'same-origin',
          headers: { Accept: 'application/json' },
        });
        const statusData = (await statusRes.json()) as {
          status: string;
          download_url?: string;
          error?: string;
        };

        if (statusData.status === 'completed') {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
          setExportPending(false);
          toast.success('Export ready', {
            action: {
              label: 'Download',
              onClick: () => window.open(statusData.download_url, '_blank'),
            },
            duration: 10000,
          });
        } else if (statusData.status === 'failed') {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
          setExportPending(false);
          toast.error('Export failed: ' + (statusData.error ?? 'Unknown error'));
        } else if (statusData.status === 'expired') {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
          setExportPending(false);
          toast.error('Export expired before download');
        }
      }, 3000);
    } catch {
      toast.error('Export request failed');
      setExportPending(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex flex-1 flex-wrap items-center gap-2">
        {onSearchChange !== undefined && (
          <Input
            placeholder="Search..."
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-9 max-w-sm"
            aria-label="Search"
          />
        )}
        {extraFilters}
      </div>

      <div className="flex items-center gap-2">
        <DataTableColumnToggle table={table} />
        {exportRouteName && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                aria-label="Export options"
                disabled={exportPending}
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => handleExport('xlsx')}
                disabled={exportPending}
              >
                {exportPending ? 'Preparing...' : 'Export Excel'}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleExport('pdf')}
                disabled={exportPending}
              >
                {exportPending ? 'Preparing...' : 'Export PDF'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
