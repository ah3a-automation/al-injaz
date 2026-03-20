import type { RfqItem } from './types';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef, useLayoutEffect } from 'react';

const ROW_HEIGHT = 48;
const CONTAINER_HEIGHT = 360;

interface RfqSupplierForComparison {
    id: string;
    supplier: { id: string; legal_name_en: string };
}

interface QuoteComparisonTableProps {
    items: RfqItem[];
    suppliers: RfqSupplierForComparison[];
    /** comparison[item_id][supplier_id] */
    comparison: Record<string, Record<string, { unit_price: string; total_price: string }>>;
}

export function QuoteComparisonTable({
    items,
    suppliers,
    comparison,
}: QuoteComparisonTableProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const suppliersWithData = suppliers.filter(
        (s) => items.length > 0 && comparison[items[0]?.id]?.[s.supplier.id]
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

    if (items.length === 0 || suppliersWithData.length === 0) {
        return (
            <div className="rounded-md border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                No items or suppliers to compare.
            </div>
        );
    }

    const gridColumns = `minmax(140px, 1.5fr) ${suppliersWithData.map(() => 'minmax(80px, 1fr)').join(' ')}`;

    return (
        <div
            ref={scrollRef}
            className="overflow-auto rounded-md border border-border"
            style={{ height: CONTAINER_HEIGHT }}
            role="region"
            aria-label="Quote comparison by item"
        >
            <div className="min-w-[400px]">
                {/* Sticky header */}
                <div
                    className="sticky top-0 z-10 grid border-b border-border bg-muted/95 px-4 py-3 text-sm font-medium"
                    style={{ gridTemplateColumns: gridColumns }}
                    role="rowheader"
                >
                    <div className="text-left">Item Description</div>
                    {suppliersWithData.map((s) => (
                        <div key={s.id} className="text-left">
                            {s.supplier.legal_name_en}
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
                        const rowData = comparison[item.id] ?? {};
                        const prices = Object.entries(rowData).map(([, v]) =>
                            parseFloat(String(v.unit_price))
                        );
                        const minPrice = prices.length ? Math.min(...prices) : null;
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
                                    minWidth: `${300 + suppliersWithData.length * 100}px`,
                                    minHeight: `${virtualRow.size}px`,
                                    transform: `translateY(${virtualRow.start}px)`,
                                    gridTemplateColumns: gridColumns,
                                }}
                            >
                                <div>{item.description_en}</div>
                                {suppliersWithData.map((s) => {
                                    const d = rowData[s.supplier.id] ?? null;
                                    const isMin =
                                        minPrice != null &&
                                        d != null &&
                                        parseFloat(String(d.unit_price)) === minPrice;
                                    return (
                                        <div
                                            key={s.id}
                                            className={`${isMin ? 'bg-green-100 dark:bg-green-900/20 font-medium' : ''}`}
                                        >
                                            {d
                                                ? parseFloat(String(d.unit_price)).toLocaleString()
                                                : '—'}
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
