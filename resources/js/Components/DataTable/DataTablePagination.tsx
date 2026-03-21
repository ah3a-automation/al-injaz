import { Button } from '@/Components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/Components/ui/select';
import { useLocale } from '@/hooks/useLocale';

interface DataTablePaginationProps {
  pagination: {
    total: number;
    current_page: number;
    per_page: number;
    last_page: number;
  };
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
  /** When set, replaces the default “Showing … results” line. */
  summarySlot?: React.ReactNode;
}

const PER_PAGE_OPTIONS = [10, 25, 50, 100];

export function DataTablePagination({
  pagination,
  onPageChange,
  onPerPageChange,
  summarySlot,
}: DataTablePaginationProps) {
  const { t } = useLocale('ui');
  const { total, current_page, per_page, last_page } = pagination;
  const from = total === 0 ? 0 : (current_page - 1) * per_page + 1;
  const to = Math.min(current_page * per_page, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <p className="text-sm text-text-muted">
        {summarySlot ??
          t('datatable_pagination_summary', 'ui', { from, to, total })}
      </p>
      <div className="flex items-center gap-2">
        <span className="text-sm text-text-muted">{t('datatable_per_page', 'ui')}</span>
        <Select
          value={String(per_page)}
          onValueChange={(v: string) => onPerPageChange(Number(v))}
        >
          <SelectTrigger className="h-9 w-[70px]" aria-label={t('datatable_rows_per_page', 'ui')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PER_PAGE_OPTIONS.map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          disabled={current_page <= 1}
          onClick={() => onPageChange(current_page - 1)}
          aria-label={t('datatable_previous_page', 'ui')}
        >
          {t('datatable_previous', 'ui')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={current_page >= last_page}
          onClick={() => onPageChange(current_page + 1)}
          aria-label={t('datatable_next_page', 'ui')}
        >
          {t('datatable_next', 'ui')}
        </Button>
      </div>
    </div>
  );
}
