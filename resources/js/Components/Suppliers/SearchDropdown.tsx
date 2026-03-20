'use client';

import { useRef, useLayoutEffect, useEffect, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { CategoryOption } from './useCategoryIndex';
import type { SearchResultWithMatches } from './useFuzzySearch';
import { highlightMatches } from './highlightMatches';

const ROW_HEIGHT = 52;
const HEADER_HEIGHT = 32;
const CONTAINER_HEIGHT = 300;

const EMPTY_SUGGESTIONS = ['concrete', 'steel', 'electrical'];

export interface GroupedSearchResult {
    rootId: string;
    rootName: string;
    items: SearchResultWithMatches[];
}

interface SearchDropdownProps {
    groupedResults: GroupedSearchResult[];
    highlightIndex: number;
    onSelect: (id: string) => void;
    onHighlightChange: (index: number) => void;
    locale: 'en' | 'ar';
    getFullPath: (id: string, locale: 'en' | 'ar') => string;
    listId: string;
    ariaActivedescendant: string | undefined;
    hasActiveQuery: boolean;
    highlight?: boolean;
}

type FlatRow =
    | { type: 'header'; rootName: string }
    | { type: 'item'; itemIndex: number; item: CategoryOption; pathIndices: readonly [number, number][] };

function buildFlatRows(grouped: GroupedSearchResult[]): { rows: FlatRow[]; itemIndexToFlatIndex: number[] } {
    const rows: FlatRow[] = [];
    const itemIndexToFlatIndex: number[] = [];
    let itemIndex = 0;
    for (const group of grouped) {
        rows.push({ type: 'header', rootName: group.rootName });
        for (const { item, pathIndices } of group.items) {
            itemIndexToFlatIndex.push(rows.length);
            rows.push({ type: 'item', itemIndex, item, pathIndices });
            itemIndex += 1;
        }
    }
    return { rows, itemIndexToFlatIndex };
}

function getRowHeight(row: FlatRow): number {
    return row.type === 'header' ? HEADER_HEIGHT : ROW_HEIGHT;
}

export function SearchDropdown({
    groupedResults,
    highlightIndex,
    onSelect,
    onHighlightChange,
    locale,
    getFullPath,
    listId,
    ariaActivedescendant,
    hasActiveQuery,
    highlight = true,
}: SearchDropdownProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    const { rows, itemIndexToFlatIndex } = useMemo(
        () => buildFlatRows(groupedResults),
        [groupedResults]
    );

    const totalItems = groupedResults.reduce((sum, g) => sum + g.items.length, 0);

    const rowVirtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement: () => scrollRef.current,
        estimateSize: (i) => getRowHeight(rows[i]),
        overscan: 5,
    });

    useLayoutEffect(() => {
        rowVirtualizer.measure();
    }, [rowVirtualizer, rows.length]);

    const flatIndexToScroll =
        highlightIndex >= 0 && highlightIndex < itemIndexToFlatIndex.length
            ? itemIndexToFlatIndex[highlightIndex]
            : -1;

    useEffect(() => {
        if (flatIndexToScroll >= 0) {
            rowVirtualizer.scrollToIndex(flatIndexToScroll, { align: 'auto' });
        }
    }, [flatIndexToScroll, rowVirtualizer]);

    const virtualItems = rowVirtualizer.getVirtualItems();

    if (hasActiveQuery && totalItems === 0) {
        return (
            <div
                role="status"
                className="rounded-md border border-border bg-background px-3 py-6 text-center text-sm text-muted-foreground"
            >
                <p className="font-medium">No categories found.</p>
                <p className="mt-2">Try searching for:</p>
                <ul className="mt-1 list-inside list-disc text-left">
                    {EMPTY_SUGGESTIONS.map((s) => (
                        <li key={s}>{s}</li>
                    ))}
                </ul>
            </div>
        );
    }

    if (totalItems === 0) {
        return null;
    }

    return (
        <div
            ref={scrollRef}
            id={listId}
            role="listbox"
            aria-activedescendant={ariaActivedescendant}
            className="overflow-auto rounded-md border border-border bg-background shadow-md"
            style={{ height: Math.min(CONTAINER_HEIGHT, rowVirtualizer.getTotalSize()) }}
        >
            <div
                className="relative w-full"
                style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
            >
                {virtualItems.map((virtualRow) => {
                    const row = rows[virtualRow.index];
                    if (row.type === 'header') {
                        return (
                            <div
                                key={`header-${row.rootName}`}
                                className="border-b border-border bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground"
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: `${virtualRow.size}px`,
                                    transform: `translateY(${virtualRow.start}px)`,
                                }}
                            >
                                {row.rootName}
                            </div>
                        );
                    }
                    const { itemIndex, item, pathIndices } = row;
                    const isHighlighted = itemIndex === highlightIndex;
                    const pathText =
                        locale === 'ar'
                            ? (item.full_path_ar ?? getFullPath(item.id, 'ar'))
                            : (item.full_path_en ?? getFullPath(item.id, 'en'));
                    const displayPath = pathText || (locale === 'ar' ? item.name_ar : item.name_en);

                    return (
                        <div
                            key={item.id}
                            role="option"
                            id={itemIndex === highlightIndex ? ariaActivedescendant : undefined}
                            aria-selected={isHighlighted}
                            className={`flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm transition-colors hover:bg-muted ${
                                isHighlighted ? 'bg-muted' : ''
                            }`}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                minHeight: `${virtualRow.size}px`,
                                transform: `translateY(${virtualRow.start}px)`,
                            }}
                            onMouseEnter={() => onHighlightChange(itemIndex)}
                            onClick={() => onSelect(item.id)}
                        >
                            <span className="w-full truncate">
                                {highlight ? highlightMatches(displayPath, pathIndices) : displayPath}
                            </span>
                            <span className="font-mono text-xs text-muted-foreground">{item.code}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
