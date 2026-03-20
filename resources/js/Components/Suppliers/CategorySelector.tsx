'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { Input } from '@/Components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { useLocale } from '@/hooks/useLocale';
import { useCategoryIndex } from './useCategoryIndex';
import { useFuzzySearch } from './useFuzzySearch';
import { SelectedTags } from './SelectedTags';
import { SearchDropdown, type GroupedSearchResult } from './SearchDropdown';
import { CategoryTree, flattenTree } from './CategoryTree';
import type { CategoryOption } from './useCategoryIndex';

export type { CategoryOption } from './useCategoryIndex';

const DEFAULT_MAX_SELECTIONS = 10;
const SEARCH_MIN_CHARS = 3;
const LISTBOX_ID = 'category-search-listbox';
const STORAGE_KEY_EXPANDED = 'categorySelectorExpandedNodes';
const POPULAR_COUNT = 8;

export interface CategorySelectorProps {
    categories: CategoryOption[];
    value: string[];
    onChange: (ids: string[]) => void;
    locale: 'en' | 'ar';
    maxSelections?: number;
    placeholder?: string;
    'aria-label'?: string;
    popularCategoryIds?: string[];
    onSelectionChange?: (ids: string[]) => void;
    size?: 'default' | 'large';
    showQuickFilters?: boolean;
    searchHighlight?: boolean;
}

function loadPersistedExpanded(): Set<string> {
    if (typeof window === 'undefined') return new Set();
    try {
        const raw = localStorage.getItem(STORAGE_KEY_EXPANDED);
        if (!raw) return new Set();
        const arr = JSON.parse(raw) as unknown;
        return Array.isArray(arr) ? new Set(arr as string[]) : new Set();
    } catch {
        return new Set();
    }
}

function savePersistedExpanded(ids: Set<string>) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(STORAGE_KEY_EXPANDED, JSON.stringify([...ids]));
    } catch {
        // ignore
    }
}

export function CategorySelector({
    categories,
    value,
    onChange,
    locale,
    maxSelections = DEFAULT_MAX_SELECTIONS,
    placeholder = 'Search categories...',
    'aria-label': ariaLabel = 'Search categories',
    popularCategoryIds,
    onSelectionChange,
    size,
    showQuickFilters = false,
    searchHighlight = true,
}: CategorySelectorProps) {
    const { t } = useLocale();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [highlightIndex, setHighlightIndex] = useState(-1);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(loadPersistedExpanded);
    const hasInitialExpanded = useRef(false);

    const index = useCategoryIndex(categories);
    const {
        categoryMap,
        childrenMap,
        leafCategoryList,
        rootCategories,
        getFullPath,
        getRootId,
        getAncestorIds,
    } = index;

    useEffect(() => {
        if (!hasInitialExpanded.current && rootCategories.length > 0) {
            hasInitialExpanded.current = true;
            setExpandedIds((prev) => {
                if (prev.size === 0) return new Set(rootCategories.map((r) => r.id));
                return new Set([...prev, ...rootCategories.map((r) => r.id)]);
            });
        }
    }, [rootCategories]);

    useEffect(() => {
        savePersistedExpanded(expandedIds);
    }, [expandedIds]);

    const selectedSet = useMemo(() => new Set(value), [value]);
    const [familyFilter, setFamilyFilter] = useState<string | 'all'>('all');

    const passesFamilyFilter = useCallback(
        (cat: CategoryOption): boolean => {
            if (familyFilter === 'all') return true;
            const rootId = getRootId(cat.id);
            return (rootId ?? cat.id) === familyFilter;
        },
        [familyFilter, getRootId]
    );

    const filteredLeafCategoryList = useMemo(
        () => leafCategoryList.filter((c) => passesFamilyFilter(c)),
        [leafCategoryList, passesFamilyFilter]
    );

    const leafIds = useMemo(
        () => new Set(filteredLeafCategoryList.map((c) => c.id)),
        [filteredLeafCategoryList]
    );

    const {
        query,
        setQuery,
        debouncedQuery,
        isDebouncing,
        searchResults,
        searchResultsWithMatches,
    } = useFuzzySearch(filteredLeafCategoryList, getFullPath, locale, selectedSet);

    const hasActiveQuery = debouncedQuery.length >= SEARCH_MIN_CHARS;
    const searchLeafIdSet = useMemo(
        () => new Set(searchResults.map((r) => r.id)),
        [searchResults]
    );

    const addId = useCallback(
        (id: string) => {
            if (value.includes(id)) return;
            if (value.length >= maxSelections) return;
            const next = [...value, id];
            onChange(next);
            setQuery('');
            setDropdownOpen(false);
            setExpandedIds((prev) => {
                const nextExp = new Set(prev);
                getAncestorIds(id).forEach((aid) => nextExp.add(aid));
                return nextExp;
            });
        },
        [value, maxSelections, onChange, getAncestorIds]
    );

    const removeId = useCallback(
        (id: string) => {
            onChange(value.filter((x) => x !== id));
        },
        [value, onChange]
    );

    const removeLastTag = useCallback(() => {
        if (value.length > 0) onChange(value.slice(0, -1));
    }, [value, onChange]);

    useEffect(() => {
        onSelectionChange?.(value);
    }, [value, onSelectionChange]);

    const toggleExpand = useCallback((id: string) => {
        setExpandedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const activeLeafIds = useMemo(
        () =>
            hasActiveQuery
                ? new Set([...leafIds].filter((id) => searchLeafIdSet.has(id)))
                : leafIds,
        [hasActiveQuery, leafIds, searchLeafIdSet]
    );

    const visibleIds = useMemo(() => {
        if (!hasActiveQuery) return null;
        const ids = new Set<string>();
        searchLeafIdSet.forEach((id) => {
            ids.add(id);
            getAncestorIds(id).forEach((ancestorId) => ids.add(ancestorId));
        });
        return ids;
    }, [hasActiveQuery, searchLeafIdSet, getAncestorIds]);

    const effectiveRootCategories = useMemo(
        () =>
            visibleIds
                ? rootCategories.filter((cat) => visibleIds.has(cat.id))
                : rootCategories,
        [rootCategories, visibleIds]
    );

    const effectiveChildrenMap = useMemo(() => {
        if (!visibleIds) return childrenMap;

        const pruned = new Map<string | null, CategoryOption[]>();

        // Preserve root-level children filtered by visibleIds
        const rootChildren = childrenMap.get(null);
        if (rootChildren && rootChildren.length > 0) {
            const filteredRootChildren = rootChildren.filter((child) =>
                visibleIds.has(child.id)
            );
            if (filteredRootChildren.length > 0) {
                pruned.set(null, filteredRootChildren);
            }
        }

        visibleIds.forEach((id) => {
            const children = childrenMap.get(id);
            if (!children || children.length === 0) return;
            const filtered = children.filter((child) => visibleIds.has(child.id));
            if (filtered.length > 0) {
                pruned.set(id, filtered);
            }
        });

        return pruned;
    }, [childrenMap, visibleIds]);

    const flattenedNodes = useMemo(
        () =>
            flattenTree(
                effectiveRootCategories,
                effectiveChildrenMap,
                expandedIds,
                activeLeafIds
            ),
        [effectiveRootCategories, effectiveChildrenMap, expandedIds, activeLeafIds]
    );

    const scrollToSelectedIndex = useMemo(() => {
        if (value.length === 0) return null;
        const firstId = value[0];
        const idx = flattenedNodes.findIndex(
            (n) => n.type === 'leaf' && n.category.id === firstId
        );
        return idx >= 0 ? idx : null;
    }, [value, flattenedNodes]);

    const popularCategories = useMemo(() => {
        const ids = popularCategoryIds?.length
            ? popularCategoryIds.filter((id) => categoryMap.has(id) && leafIds.has(id))
            : leafCategoryList.slice(0, POPULAR_COUNT).map((c) => c.id);
        return ids.slice(0, POPULAR_COUNT).map((id) => categoryMap.get(id)!).filter(Boolean);
    }, [popularCategoryIds, categoryMap, leafIds, leafCategoryList]);

    const showPopular =
        dropdownOpen && query.length < SEARCH_MIN_CHARS && popularCategories.length > 0;

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'Escape') {
                setDropdownOpen(false);
                setQuery('');
                return;
            }
            if (e.key === 'Backspace' && query === '' && value.length > 0) {
                e.preventDefault();
                removeLastTag();
                return;
            }
        },
        [query, value.length, removeLastTag]
    );

    const ariaActivedescendant: string | undefined = undefined;

    const familyOptions = useMemo(
        () =>
            rootCategories.map((r) => ({
                id: r.id,
                name: locale === 'ar' ? r.name_ar ?? r.name_en : r.name_en ?? r.name_ar,
            })),
        [rootCategories, locale]
    );

    return (
        <div
            className="space-y-4"
            style={size === 'large' ? { minHeight: 380 } : undefined}
            role="combobox"
            aria-expanded={dropdownOpen}
            aria-controls={LISTBOX_ID}
        >
            {showQuickFilters && familyOptions.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 text-xs">
                    <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                            {t('category_family_label', 'supplier_portal')}
                        </span>
                        <Select
                            value={familyFilter}
                            onValueChange={(v) =>
                                setFamilyFilter(v === 'all' ? 'all' : (v as string))
                            }
                        >
                            <SelectTrigger className="h-8 w-52 text-start">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all" className="text-start">
                                    {t('category_all', 'supplier_portal')}
                                </SelectItem>
                                {familyOptions.map((f) => (
                                    <SelectItem key={f.id} value={f.id} className="text-start">
                                        {f.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            )}

            <div className="relative">
                {isDebouncing ? (
                    <Loader2
                        className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground"
                        aria-hidden
                    />
                ) : (
                    <Search
                        className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                        aria-hidden
                    />
                )}
                <Input
                    type="search"
                    placeholder={placeholder}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setDropdownOpen(false), 180)}
                    onKeyDown={handleKeyDown}
                    className={`pl-9 ${isDebouncing ? 'pr-24' : ''}`}
                    aria-label={ariaLabel}
                    aria-expanded={dropdownOpen}
                    aria-autocomplete="list"
                    aria-controls={LISTBOX_ID}
                    aria-activedescendant={ariaActivedescendant}
                />
                {isDebouncing && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                        {/* text via translations in parent page */}
                    </span>
                )}
            </div>

            <SelectedTags
                value={value}
                categoryMap={categoryMap}
                locale={locale}
                onRemove={removeId}
                maxSelections={maxSelections}
            />

            <div className="space-y-1">
                <div className="text-sm font-medium text-muted-foreground">
                    {/* label via translations in parent page */}
                </div>
                <CategoryTree
                    flattenedNodes={flattenedNodes}
                    expandedIds={expandedIds}
                    onToggleExpand={toggleExpand}
                    selectedIds={selectedSet}
                    maxSelections={maxSelections}
                    onToggleLeaf={(id) => {
                        if (value.includes(id)) removeId(id);
                        else addId(id);
                    }}
                    locale={locale}
                    getFullPath={getFullPath}
                    scrollToIndex={scrollToSelectedIndex}
                />
            </div>

            {value.length >= maxSelections && (
                <p className="text-xs text-muted-foreground">
                    {/* helper via translations in parent page */}
                </p>
            )}
        </div>
    );
}
