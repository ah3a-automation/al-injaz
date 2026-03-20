import type { RfqItem } from './types';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef, useLayoutEffect } from 'react';

const ROW_HEIGHT = 48;
const CONTAINER_HEIGHT = 400;

interface ItemsTableProps {
    items: RfqItem[];
}

export function ItemsTable({ items }: ItemsTableProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

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
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No items.
            </div>
        );
    }

    return (
        <div
            ref={scrollRef}
            className="overflow-auto rounded-md border border-border"
            style={{ height: CONTAINER_HEIGHT }}
            role="region"
            aria-label="RFQ items"
        >
            <div className="min-w-[500px]">
                {/* Sticky header */}
                <div
                    className="sticky top-0 z-10 grid grid-cols-[minmax(80px,0.8fr)_1fr_60px_60px_90px] gap-4 border-b border-border bg-muted/95 px-4 py-3 text-sm font-medium"
                    role="rowheader"
                >
                    <div className="text-left">Code</div>
                    <div className="text-left">Description</div>
                    <div className="text-left">Unit</div>
                    <div className="text-right">Qty</div>
                    <div className="text-right">Est. cost</div>
                </div>

                {/* Virtualized body */}
                <div
                    className="relative"
                    style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
                >
                    {virtualItems.map((virtualRow) => {
                        const item = items[virtualRow.index];
                        return (
                            <div
                                key={item.id}
                                role="row"
                                tabIndex={0}
                                className="grid grid-cols-[minmax(80px,0.8fr)_1fr_60px_60px_90px] gap-4 border-b border-border px-4 py-3 text-sm hover:bg-muted/30"
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    minWidth: '500px',
                                    minHeight: `${virtualRow.size}px`,
                                    transform: `translateY(${virtualRow.start}px)`,
                                }}
                            >
                                <div className="font-mono">{item.code ?? '—'}</div>
                                <div>{item.description_en}</div>
                                <div>{item.unit ?? '—'}</div>
                                <div className="text-right tabular-nums">{item.qty ?? '—'}</div>
                                <div className="text-right tabular-nums">
                                    {parseFloat(item.estimated_cost).toLocaleString()}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
