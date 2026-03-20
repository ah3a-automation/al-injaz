import { useState, useEffect, useMemo } from 'react';
import Fuse from 'fuse.js';
import type { CategoryOption } from './useCategoryIndex';

const SEARCH_MIN_CHARS = 3;
const DEBOUNCE_MS = 300;
const MAX_RESULTS = 20;

export type PathMatchIndices = readonly [number, number][];

export interface SearchResultWithMatches {
    item: CategoryOption;
    pathIndices: PathMatchIndices;
}

export interface SearchableCategory extends CategoryOption {
    full_path_en: string;
    full_path_ar: string;
}

export function useFuzzySearch(
    leafCategoryList: CategoryOption[],
    getFullPath: (id: string, locale: 'en' | 'ar') => string,
    locale: 'en' | 'ar',
    selectedIds: Set<string>
): {
    query: string;
    setQuery: (q: string) => void;
    debouncedQuery: string;
    isDebouncing: boolean;
    searchResults: CategoryOption[];
    searchResultsWithMatches: SearchResultWithMatches[];
} {
    const [query, setQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');

    useEffect(() => {
        const t = setTimeout(() => {
            setDebouncedQuery(query.trim().toLowerCase());
        }, DEBOUNCE_MS);
        return () => clearTimeout(t);
    }, [query]);

    const isDebouncing = query.trim().toLowerCase() !== debouncedQuery;

    const searchIndex = useMemo(() => {
        return leafCategoryList.map((cat) => ({
            ...cat,
            full_path_en: cat.full_path_en ?? getFullPath(cat.id, 'en'),
            full_path_ar: cat.full_path_ar ?? getFullPath(cat.id, 'ar'),
        }));
    }, [leafCategoryList, getFullPath]);

    const fuse = useMemo(
        () =>
            new Fuse(searchIndex, {
                keys: ['code', 'name_en', 'name_ar', 'full_path_en', 'full_path_ar'],
                threshold: 0.3,
                ignoreLocation: true,
                includeMatches: true,
            }),
        [searchIndex]
    );

    const { searchResults, searchResultsWithMatches } = useMemo(() => {
        if (debouncedQuery.length < SEARCH_MIN_CHARS) {
            return { searchResults: [] as CategoryOption[], searchResultsWithMatches: [] as SearchResultWithMatches[] };
        }
        const pathKey = locale === 'ar' ? 'full_path_ar' : 'full_path_en';
        const raw = fuse.search(debouncedQuery);
        const filtered = raw.filter((r) => !selectedIds.has(r.item.id)).slice(0, MAX_RESULTS);
        const items = filtered.map((r) => r.item);
        const withMatches: SearchResultWithMatches[] = filtered.map((r) => {
            const pathMatch = r.matches?.find((m) => m.key === pathKey);
            const pathIndices = (pathMatch?.indices ?? []) as PathMatchIndices;
            return { item: r.item, pathIndices };
        });
        return { searchResults: items, searchResultsWithMatches: withMatches };
    }, [debouncedQuery, fuse, selectedIds, locale]);

    return { query, setQuery, debouncedQuery, isDebouncing, searchResults, searchResultsWithMatches };
}
