import type { RfqEvaluationRow } from './types';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef, useLayoutEffect } from 'react';

const ROW_HEIGHT = 48;
const CONTAINER_HEIGHT = 360;

interface EvaluationTableProps {
    evaluations: RfqEvaluationRow[];
}

export function EvaluationTable({ evaluations }: EvaluationTableProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    const rowVirtualizer = useVirtualizer({
        count: evaluations.length,
        getScrollElement: () => scrollRef.current,
        estimateSize: () => ROW_HEIGHT,
        overscan: 10,
    });

    useLayoutEffect(() => {
        rowVirtualizer.measure();
    }, [rowVirtualizer, evaluations.length]);

    const virtualItems = rowVirtualizer.getVirtualItems();

    if (evaluations.length === 0) {
        return (
            <div className="rounded-md border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                No evaluation records yet.
            </div>
        );
    }

    const gridColumns = 'minmax(120px, 1fr) 70px 70px 70px 70px minmax(100px, 1fr) minmax(120px, 1fr)';

    return (
        <div
            ref={scrollRef}
            className="overflow-auto rounded-md border border-border"
            style={{ height: CONTAINER_HEIGHT }}
            role="region"
            aria-label="Supplier evaluations"
        >
            <div className="min-w-[600px]">
                {/* Sticky header */}
                <div
                    className="sticky top-0 z-10 grid border-b border-border bg-muted/80 px-4 py-3 text-sm font-medium"
                    style={{ gridTemplateColumns: gridColumns }}
                    role="rowheader"
                >
                    <div className="text-left">Supplier</div>
                    <div className="text-right">Price</div>
                    <div className="text-right">Technical</div>
                    <div className="text-right">Commercial</div>
                    <div className="text-right">Total</div>
                    <div className="text-left">Evaluator</div>
                    <div className="text-left">Created</div>
                </div>

                {/* Virtualized body */}
                <div
                    className="relative"
                    style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
                >
                    {virtualItems.map((virtualRow) => {
                        const evaluation = evaluations[virtualRow.index];
                        return (
                            <div
                                key={evaluation.id}
                                role="row"
                                tabIndex={0}
                                className="grid border-b border-border px-4 py-3 text-sm hover:bg-muted/30"
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    minWidth: '600px',
                                    minHeight: `${virtualRow.size}px`,
                                    transform: `translateY(${virtualRow.start}px)`,
                                    gridTemplateColumns: gridColumns,
                                }}
                            >
                                <div>{evaluation.supplier?.legal_name_en ?? '—'}</div>
                                <div className="text-right tabular-nums">
                                    {evaluation.price_score.toFixed(2)}
                                </div>
                                <div className="text-right tabular-nums">
                                    {evaluation.technical_score.toFixed(2)}
                                </div>
                                <div className="text-right tabular-nums">
                                    {evaluation.commercial_score.toFixed(2)}
                                </div>
                                <div className="text-right tabular-nums font-semibold">
                                    {evaluation.total_score.toFixed(2)}
                                </div>
                                <div>{evaluation.evaluator?.name ?? '—'}</div>
                                <div className="text-muted-foreground">
                                    {evaluation.created_at
                                        ? new Date(evaluation.created_at).toLocaleString()
                                        : '—'}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
