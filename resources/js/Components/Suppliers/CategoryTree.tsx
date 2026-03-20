'use client';

import { useRef, useLayoutEffect, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { Checkbox } from '@/Components/ui/checkbox';
import type { CategoryOption } from './useCategoryIndex';

const ROW_HEIGHT = 36;
const TREE_CONTAINER_HEIGHT = 300;

export interface FlattenedNode {
    type: 'parent' | 'leaf';
    category: CategoryOption;
    depth: number;
}

interface CategoryTreeProps {
    flattenedNodes: FlattenedNode[];
    expandedIds: Set<string>;
    onToggleExpand: (id: string) => void;
    selectedIds: Set<string>;
    maxSelections: number;
    onToggleLeaf: (id: string) => void;
    locale: 'en' | 'ar';
    getFullPath: (id: string, locale: 'en' | 'ar') => string;
    scrollToIndex: number | null;
}

export function CategoryTree({
    flattenedNodes,
    expandedIds,
    onToggleExpand,
    selectedIds,
    maxSelections,
    onToggleLeaf,
    locale,
    getFullPath,
    scrollToIndex,
}: CategoryTreeProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    const rowVirtualizer = useVirtualizer({
        count: flattenedNodes.length,
        getScrollElement: () => scrollRef.current,
        estimateSize: () => ROW_HEIGHT,
        overscan: 10,
    });

    useLayoutEffect(() => {
        rowVirtualizer.measure();
    }, [rowVirtualizer, flattenedNodes.length]);

    useEffect(() => {
        if (scrollToIndex !== null && scrollToIndex >= 0 && scrollToIndex < flattenedNodes.length) {
            rowVirtualizer.scrollToIndex(scrollToIndex, { align: 'auto' });
        }
    }, [scrollToIndex, flattenedNodes.length, rowVirtualizer]);

    const virtualItems = rowVirtualizer.getVirtualItems();

    if (flattenedNodes.length === 0) {
        return (
            <div className="rounded-md border border-border bg-muted/20 px-3 py-6 text-center text-sm text-muted-foreground">
                No categories to browse.
            </div>
        );
    }

    return (
        <div
            ref={scrollRef}
            role="tree"
            aria-label="Browse categories"
            className="overflow-auto rounded-md border border-border bg-muted/20"
            style={{ height: TREE_CONTAINER_HEIGHT }}
        >
            <div
                className="relative w-full"
                style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
            >
                {virtualItems.map((virtualRow) => {
                    const node = flattenedNodes[virtualRow.index];
                    const { type, category, depth } = node;
                    const isExpanded = expandedIds.has(category.id);

                    if (type === 'parent') {
                        return (
                            <div
                                key={category.id}
                                role="treeitem"
                                aria-expanded={isExpanded}
                                className="flex items-center gap-2 py-1.5 pr-2 text-sm hover:bg-muted/50"
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    minHeight: `${virtualRow.size}px`,
                                    transform: `translateY(${virtualRow.start}px)`,
                                    paddingLeft: `${12 + depth * 16}px`,
                                }}
                            >
                                <button
                                    type="button"
                                    onClick={() => onToggleExpand(category.id)}
                                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded"
                                    aria-label={isExpanded ? 'Collapse' : 'Expand'}
                                >
                                    {isExpanded ? (
                                        <ChevronDown className="h-4 w-4" />
                                    ) : (
                                        <ChevronRight className="h-4 w-4 rtl:rotate-180 transition-transform" />
                                    )}
                                </button>
                                <span className="min-w-0 flex-1 truncate text-muted-foreground">
                                    {locale === 'ar' ? category.name_ar : category.name_en}
                                </span>
                            </div>
                        );
                    }

                    const isSelected = selectedIds.has(category.id);
                    const isDisabled = !isSelected && selectedIds.size >= maxSelections;
                    const pathLabel = getFullPath(category.id, locale);

                    return (
                        <div
                            key={category.id}
                            role="treeitem"
                            className="flex items-center gap-2 py-1.5 pr-2 text-sm hover:bg-muted/50"
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                minHeight: `${virtualRow.size}px`,
                                transform: `translateY(${virtualRow.start}px)`,
                                paddingLeft: `${12 + depth * 16}px`,
                            }}
                        >
                            <span className="h-6 w-6 shrink-0" />
                            <Checkbox
                                id={`tree-leaf-${category.id}`}
                                checked={isSelected}
                                disabled={isDisabled}
                                onCheckedChange={() => !isDisabled && onToggleLeaf(category.id)}
                                className="shrink-0"
                                aria-label={`Select ${pathLabel}`}
                            />
                            <label
                                htmlFor={`tree-leaf-${category.id}`}
                                className="min-w-0 flex-1 cursor-pointer truncate"
                                title={pathLabel}
                            >
                                {pathLabel || (locale === 'ar' ? category.name_ar : category.name_en)}
                            </label>
                            <span className="shrink-0 font-mono text-xs text-muted-foreground">
                                {category.code}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export function flattenTree(
    rootCategories: CategoryOption[],
    childrenMap: Map<string | null, CategoryOption[]>,
    expandedIds: Set<string>,
    leafIds: Set<string>
): FlattenedNode[] {
    const result: FlattenedNode[] = [];

    function walk(nodes: CategoryOption[], depth: number) {
        for (const cat of nodes) {
            const isLeaf = leafIds.has(cat.id);
            const children = childrenMap.get(cat.id) ?? [];
            if (isLeaf) {
                result.push({ type: 'leaf', category: cat, depth });
            } else {
                result.push({ type: 'parent', category: cat, depth });
                if (expandedIds.has(cat.id) && children.length > 0) {
                    walk(children, depth + 1);
                }
            }
        }
    }

    walk(rootCategories, 0);
    return result;
}
