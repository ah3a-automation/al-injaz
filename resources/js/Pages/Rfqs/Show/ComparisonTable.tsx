import { Badge } from '@/Components/ui/badge';
import type { ComparisonSupplier, ComparisonSummary, RfqItem } from './types';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef, useLayoutEffect, useMemo } from 'react';

const ROW_HEIGHT = 48;
const CONTAINER_HEIGHT = 420;

interface ComparisonTableProps {
    items: RfqItem[];
    comparisonSuppliers: ComparisonSupplier[];
    comparisonQuotesMatrix: Record<string, Record<string, { unit_price: string; total_price: string }>>;
    comparisonSummary: ComparisonSummary;
}

function buildGridColumns(supplierCount: number): string {
    return `minmax(80px, 0.8fr) minmax(140px, 1.5fr) 60px 90px ${Array(supplierCount).fill('minmax(110px, 1fr)').join(' ')}`;
}

export function ComparisonTable({
    items,
    comparisonSuppliers,
    comparisonQuotesMatrix,
    comparisonSummary,
}: ComparisonTableProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const gridColumns = useMemo(
        () => buildGridColumns(comparisonSuppliers.length),
        [comparisonSuppliers.length]
    );

    const rowVirtualizer = useVirtualizer({
        count: items.length,
        getScrollElement: () => scrollRef.current,
        estimateSize: () => ROW_HEIGHT,
        overscan: 10,
    });

    useLayoutEffect(() => {
        rowVirtualizer.measure();
    }, [rowVirtualizer, items.length]);

    const virtualItems = rowVirtualizer.getVirtualItems();

    if (items.length === 0) {
        return (
            <div className="rounded-md border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                No items to compare.
            </div>
        );
    }

    return (
        <div
            ref={scrollRef}
            className="overflow-auto rounded-md border border-border bg-background"
            style={{ height: CONTAINER_HEIGHT }}
            role="region"
            aria-label="Quote comparison matrix"
        >
            <div className="min-w-[600px]" style={{ minWidth: `${400 + comparisonSuppliers.length * 120}px` }}>
                {/* Sticky header */}
                <div
                    className="sticky top-0 z-10 grid border-b border-border bg-muted/95 px-4 py-3 text-sm font-medium shadow-sm"
                    style={{ gridTemplateColumns: gridColumns }}
                    role="rowheader"
                >
                    <div className="text-left">Item code</div>
                    <div className="text-left">Description</div>
                    <div className="text-right">Qty</div>
                    <div className="text-right">Est. cost</div>
                    {comparisonSuppliers.map((s) => (
                        <div key={s.id} className="flex flex-col items-end gap-0.5 text-right">
                            <span>{s.legal_name_en}</span>
                            <Badge
                                variant="outline"
                                className={`text-xs font-normal ${
                                    (s.completeness_pct ?? 0) >= 100
                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-green-300'
                                        : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-300'
                                }`}
                            >
                                {(s.priced_items ?? 0)}/{(s.total_rfq_items ?? 0)} ({s.completeness_pct ?? 0}%)
                            </Badge>
                            {s.variance_pct != null && (
                                <span
                                    className={`text-xs tabular-nums ${
                                        s.variance_pct > 0
                                            ? 'text-amber-600 dark:text-amber-400'
                                            : s.variance_pct < 0
                                              ? 'text-green-600 dark:text-green-400'
                                              : 'text-muted-foreground'
                                    }`}
                                >
                                    {s.variance_pct > 0 ? '+' : ''}
                                    {s.variance_pct}% vs est.
                                </span>
                            )}
                        </div>
                    ))}
                </div>

                {/* Virtualized body */}
                <div
                    className="relative"
                    style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
                >
                    {virtualItems.map((virtualRow) => {
                        const item = items[virtualRow.index];
                        const rowData = comparisonQuotesMatrix[item.id] ?? {};
                        const totals = Object.entries(rowData).map(([, v]) => parseFloat(String(v.total_price)));
                        const minTotal = totals.length ? Math.min(...totals) : null;
                        return (
                            <div
                                key={item.id}
                                role="row"
                                tabIndex={0}
                                className="grid border-b border-border px-4 py-3 text-sm hover:bg-muted/30"
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    minWidth: `${400 + comparisonSuppliers.length * 120}px`,
                                    minHeight: `${virtualRow.size}px`,
                                    transform: `translateY(${virtualRow.start}px)`,
                                    gridTemplateColumns: gridColumns,
                                }}
                            >
                                <div className="font-mono">{item.code ?? '—'}</div>
                                <div>{item.description_en}</div>
                                <div className="text-right tabular-nums">{item.qty ?? '—'}</div>
                                <div className="text-right tabular-nums">
                                    {parseFloat(item.estimated_cost).toLocaleString(undefined, {
                                        minimumFractionDigits: 0,
                                        maximumFractionDigits: 2,
                                    })}
                                </div>
                                {comparisonSuppliers.map((s) => {
                                    const cell = rowData[s.id];
                                    const totalPrice = cell ? parseFloat(cell.total_price) : null;
                                    const isLowest =
                                        minTotal != null && totalPrice != null && totalPrice === minTotal;
                                    const isMissing = !cell;
                                    return (
                                        <div
                                            key={s.id}
                                            className={`text-right tabular-nums ${isLowest ? 'bg-green-50 dark:bg-green-900/30 font-medium' : ''} ${isMissing ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400' : ''}`}
                                        >
                                            {cell ? (
                                                <>
                                                    {parseFloat(cell.unit_price).toLocaleString(undefined, {
                                                        minimumFractionDigits: 0,
                                                        maximumFractionDigits: 4,
                                                    })}{' '}
                                                    /{' '}
                                                    {parseFloat(cell.total_price).toLocaleString(undefined, {
                                                        minimumFractionDigits: 0,
                                                        maximumFractionDigits: 2,
                                                    })}
                                                </>
                                            ) : (
                                                <span className="font-medium">Missing</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>

                {/* Footer (totals row) */}
                <div
                    className="grid border-t-2 border-border bg-muted/50 px-4 py-3 font-medium"
                    style={{ gridTemplateColumns: gridColumns }}
                    role="row"
                >
                    <div className="col-span-4">Totals</div>
                    {comparisonSuppliers.map((s) => (
                        <div key={s.id} className="text-right tabular-nums">
                            {(comparisonSummary.supplier_totals[s.id] ?? 0).toLocaleString(undefined, {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 2,
                            })}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
