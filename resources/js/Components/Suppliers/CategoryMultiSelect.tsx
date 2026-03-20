'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/Components/ui/input';
import { Search, X } from 'lucide-react';

export interface CategoryOption {
    id: string;
    code: string;
    name_en: string;
    name_ar: string;
    parent_id: string | null;
    level?: number;
    full_path_en?: string;
    full_path_ar?: string;
    is_leaf?: boolean;
}

const DEFAULT_MAX_SELECTIONS = 10;
const SEARCH_MIN_CHARS = 3;
const SEARCH_DEBOUNCE_MS = 300;
const MAX_RESULTS = 20;

function buildFullPath(
    categoryId: string,
    byId: Map<string, CategoryOption>,
    locale: 'en' | 'ar'
): string {
    const cat = byId.get(categoryId);
    if (!cat) return '';
    const name = locale === 'ar' ? (cat.name_ar ?? cat.name_en) : (cat.name_en ?? cat.name_ar);
    if (!cat.parent_id) return name;
    const parentPath = buildFullPath(cat.parent_id, byId, locale);
    return parentPath ? `${parentPath} > ${name}` : name;
}

export interface CategoryMultiSelectProps {
    categories: CategoryOption[];
    value: string[];
    onChange: (ids: string[]) => void;
    locale: 'en' | 'ar';
    maxSelections?: number;
    placeholder?: string;
    'aria-label'?: string;
}

export function CategoryMultiSelect({
    categories,
    value,
    onChange,
    locale,
    maxSelections = DEFAULT_MAX_SELECTIONS,
    placeholder = 'Search categories...',
    'aria-label': ariaLabel = 'Search categories',
}: CategoryMultiSelectProps) {
    const [query, setQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [highlightIndex, setHighlightIndex] = useState(-1);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    useEffect(() => {
        const t = setTimeout(() => {
            setDebouncedQuery(query.trim().toLowerCase());
        }, SEARCH_DEBOUNCE_MS);
        return () => clearTimeout(t);
    }, [query]);

    const categoryMap = useMemo(
        () => new Map(categories.map((c) => [c.id, c])),
        [categories]
    );

    const getFullPath = useCallback(
        (id: string, loc: 'en' | 'ar') => {
            const cat = categoryMap.get(id);
            const precomputed = loc === 'ar' ? cat?.full_path_ar : cat?.full_path_en;
            if (precomputed != null && precomputed !== '') return precomputed;
            return buildFullPath(id, categoryMap, loc);
        },
        [categoryMap]
    );

    const leafCategories = useMemo(() => {
        const parentIds = new Set(categories.map((c) => c.parent_id).filter(Boolean));
        return categories.filter((c) => c.is_leaf ?? !parentIds.has(c.id));
    }, [categories]);

    const selectedSet = useMemo(() => new Set(value), [value]);

    const filteredResults = useMemo(() => {
        if (debouncedQuery.length < SEARCH_MIN_CHARS) return [];
        const q = debouncedQuery;
        return leafCategories
            .filter((cat) => {
                const nameEn = (cat.name_en ?? '').toLowerCase();
                const nameAr = (cat.name_ar ?? '').toLowerCase();
                const code = (cat.code ?? '').toLowerCase();
                const pathEn = (cat.full_path_en ?? getFullPath(cat.id, 'en')).toLowerCase();
                const pathAr = (cat.full_path_ar ?? getFullPath(cat.id, 'ar')).toLowerCase();
                return (
                    nameEn.includes(q) ||
                    nameAr.includes(q) ||
                    code.includes(q) ||
                    pathEn.includes(q) ||
                    pathAr.includes(q)
                );
            })
            .filter((cat) => !selectedSet.has(cat.id))
            .slice(0, MAX_RESULTS);
    }, [debouncedQuery, leafCategories, selectedSet, getFullPath]);

    const showDropdown = dropdownOpen && debouncedQuery.length >= SEARCH_MIN_CHARS;

    const selectId = useCallback(
        (id: string) => {
            if (value.includes(id)) return;
            if (value.length >= maxSelections) return;
            onChange([...value, id]);
            setQuery('');
            setHighlightIndex(-1);
        },
        [value, maxSelections, onChange]
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
        if (!showDropdown) setHighlightIndex(-1);
        else setHighlightIndex(filteredResults.length > 0 ? 0 : -1);
    }, [showDropdown, filteredResults.length]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'Escape') {
                setDropdownOpen(false);
                setQuery('');
                setHighlightIndex(-1);
                return;
            }
            if (e.key === 'Backspace' && query === '' && value.length > 0) {
                e.preventDefault();
                removeLastTag();
                return;
            }
            if (!showDropdown || filteredResults.length === 0) return;
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setHighlightIndex((i) => (i < filteredResults.length - 1 ? i + 1 : i));
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setHighlightIndex((i) => (i > 0 ? i - 1 : 0));
                return;
            }
            if (e.key === 'Enter' && highlightIndex >= 0 && filteredResults[highlightIndex]) {
                e.preventDefault();
                selectId(filteredResults[highlightIndex].id);
                return;
            }
        },
        [showDropdown, filteredResults, highlightIndex, query, value.length, removeLastTag, selectId]
    );

    useEffect(() => {
        if (listRef.current && highlightIndex >= 0) {
            const el = listRef.current.querySelector(`[data-index="${highlightIndex}"]`);
            el?.scrollIntoView({ block: 'nearest' });
        }
    }, [highlightIndex]);

    return (
        <div ref={containerRef} className="space-y-3">
            <div className="relative">
                <Search
                    className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                />
                <Input
                    type="search"
                    placeholder={placeholder}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setDropdownOpen(true)}
                    onBlur={() => {
                        setTimeout(() => setDropdownOpen(false), 150);
                    }}
                    onKeyDown={handleKeyDown}
                    className="pl-9"
                    aria-label={ariaLabel}
                    aria-expanded={showDropdown}
                    aria-autocomplete="list"
                    aria-controls="category-results-list"
                    id="category-search-input"
                />
            </div>

            {value.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {value.map((id) => {
                        const cat = categoryMap.get(id);
                        const label = cat
                            ? (locale === 'ar' ? cat.name_ar : cat.name_en) || cat.code
                            : id;
                        const code = cat?.code ?? '';
                        return (
                            <span
                                key={id}
                                className="flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-1 text-xs"
                            >
                                <span className="max-w-[200px] truncate" title={label}>
                                    {label}
                                </span>
                                {code && (
                                    <span className="shrink-0 font-mono text-muted-foreground">{code}</span>
                                )}
                                <button
                                    type="button"
                                    onClick={() => removeId(id)}
                                    className="rounded p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                    aria-label="Remove category"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </span>
                        );
                    })}
                </div>
            )}

            {showDropdown && (
                <div
                    id="category-results-list"
                    role="listbox"
                    className="rounded-md border border-border bg-background shadow-md"
                >
                    <ul
                        ref={listRef}
                        className="max-h-[260px] overflow-y-auto py-1"
                        role="presentation"
                    >
                        {filteredResults.length === 0 ? (
                            <li className="px-3 py-4 text-center text-sm text-muted-foreground">
                                No matching categories.
                            </li>
                        ) : (
                            filteredResults.map((cat, index) => {
                                const fullPath =
                                    locale === 'ar'
                                        ? (cat.full_path_ar ?? getFullPath(cat.id, 'ar'))
                                        : (cat.full_path_en ?? getFullPath(cat.id, 'en'));
                                const isHighlighted = index === highlightIndex;
                                return (
                                    <li key={cat.id} role="option" data-index={index}>
                                        <button
                                            type="button"
                                            onClick={() => selectId(cat.id)}
                                            className={`flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm transition-colors hover:bg-muted ${
                                                isHighlighted ? 'bg-muted' : ''
                                            }`}
                                        >
                                            <span className="w-full truncate">{fullPath || (locale === 'ar' ? cat.name_ar : cat.name_en)}</span>
                                            <span className="font-mono text-xs text-muted-foreground">
                                                {cat.code}
                                            </span>
                                        </button>
                                    </li>
                                );
                            })
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
}
