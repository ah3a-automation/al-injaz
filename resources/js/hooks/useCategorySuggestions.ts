import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Fuse from 'fuse.js';

const DEBOUNCE_MS = 600;
const AI_DEBOUNCE_MS = 800;

/** In-memory cache for AI suggestion results (key -> category ids). */
const AI_CACHE = new Map<string, string[]>();

function getCsrfToken(): string {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
}
const MAX_SUGGESTIONS = 5;
const MAX_CACHE_ENTRIES = 50;
const MIN_LEGAL_NAME_LEN = 5;
const MIN_TRADE_NAME_LEN = 5;
const MIN_WEBSITE_LEN = 6;
const DISABLE_SUGGESTIONS_WHEN_SELECTED_AT_LEAST = 5;

export interface CategorySuggestion {
    id: string;
    score: number;
    matchedKeywords: string[];
}

const suggestionCache = new Map<string, CategorySuggestion[]>();

function getCacheKey(signature: string): string {
    return signature;
}

function getCached(signature: string): CategorySuggestion[] | undefined {
    return suggestionCache.get(signature);
}

function setCached(signature: string, value: CategorySuggestion[]) {
    if (suggestionCache.size >= MAX_CACHE_ENTRIES) {
        const firstKey = suggestionCache.keys().next().value;
        if (firstKey !== undefined) suggestionCache.delete(firstKey);
    }
    suggestionCache.set(signature, value);
}

/** Category shape used by the suggestion engine (supplier_type optional for filtering). */
export interface CategoryForSuggestion {
    id: string;
    code: string;
    name_en: string;
    name_ar: string;
    parent_id: string | null;
    level?: number;
    is_leaf?: boolean;
    full_path_en?: string;
    full_path_ar?: string;
    supplier_type?: string;
}

const STOPWORDS_EN = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he', 'in', 'is', 'it',
    'its', 'of', 'on', 'that', 'the', 'to', 'was', 'were', 'will', 'with', 'the', 'co', 'com', 'www',
]);
const STOPWORDS_AR = new Set(['ال', 'في', 'من', 'على', 'عن', 'مع', 'هي', 'هو', 'هذا', 'هذه', 'ذلك', 'و', 'ب', 'ل']);

const GENERIC_COMPANY_WORDS = new Set([
    'company',
    'group',
    'international',
    'factory',
    'trading',
    'services',
    'est',
    'establishment',
    'limited',
    'ltd',
    'شركة',
    'مؤسسة',
    'مجموعة',
    'مصنع',
    'تجارة',
    'الخدمات',
    'محدودة',
]);
const MAX_KEYWORDS = 6;

function buildFullPath(
    categoryId: string,
    byId: Map<string, CategoryForSuggestion>,
    locale: 'en' | 'ar'
): string {
    const cat = byId.get(categoryId);
    if (!cat) return '';
    const name = locale === 'ar' ? (cat.name_ar ?? cat.name_en) : (cat.name_en ?? cat.name_ar);
    if (!cat.parent_id) return name;
    const parentPath = buildFullPath(cat.parent_id, byId, locale);
    return parentPath ? `${parentPath} > ${name}` : name;
}

function extractKeywords(
    legalNameEn: string,
    legalNameAr: string,
    tradeName: string,
    website: string
): string[] {
    const parts: string[] = [];
    const pushTokens = (text: string, isArabic: boolean) => {
        if (!text || !text.trim()) return;
        const normalized = text
            .replace(/[^\p{L}\p{N}\s]/gu, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        const lower = normalized.toLowerCase();
        const tokens = (isArabic ? normalized : lower).split(/\s+/).filter((t) => t.length >= 2);
        const stop = isArabic ? STOPWORDS_AR : STOPWORDS_EN;
        const toAdd = isArabic ? tokens : tokens.map((t) => t.toLowerCase());
        toAdd.forEach((t) => {
            const key = isArabic ? t : t.toLowerCase();
            if (!stop.has(t) && !GENERIC_COMPANY_WORDS.has(key)) parts.push(t);
        });
    };
    pushTokens(legalNameEn, false);
    pushTokens(legalNameAr, true);
    pushTokens(tradeName, false);
    if (website) {
        const cleaned = website.replace(/^https?:\/\//i, '').replace(/^www\./, '').split(/[./]/);
        cleaned.forEach((s) => pushTokens(s, false));
    }
    return [...new Set(parts)].slice(0, MAX_KEYWORDS);
}

export interface UseCategorySuggestionsParams {
    categories: CategoryForSuggestion[];
    supplierType: string;
    legalNameEn: string;
    legalNameAr: string;
    tradeName: string;
    website: string;
    locale: 'en' | 'ar';
    selectedIds: string[];
    allowedCategoryTypes?: string[];
}

export interface UseCategorySuggestionsResult {
    suggestions: CategorySuggestion[];
    aiSuggestionIds: string[];
    isAiLoading: boolean;
}

/**
 * Suggests categories based on supplier inputs (names, trade name, website).
 * Uses AI API when enabled and authenticated, then merges with local Fuse matching.
 */
export function useCategorySuggestions({
    categories,
    supplierType,
    legalNameEn,
    legalNameAr,
    tradeName,
    website,
    locale,
    selectedIds,
    allowedCategoryTypes = [],
}: UseCategorySuggestionsParams): UseCategorySuggestionsResult {
    const [suggested, setSuggested] = useState<CategorySuggestion[]>([]);
    const [aiSuggestionIds, setAiSuggestionIds] = useState<string[]>([]);
    const [aiLoading, setAiLoading] = useState(false);
    const aiDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const categoryMap = useMemo(
        () => new Map(categories.map((c) => [c.id, c])),
        [categories]
    );

    const getFullPath = useCallback(
        (id: string, loc: 'en' | 'ar') => buildFullPath(id, categoryMap, loc),
        [categoryMap]
    );

    const leafCategories = useMemo(() => {
        const parentIds = new Set(categories.map((c) => c.parent_id).filter(Boolean));
        let leaves = categories.filter((c) => c.is_leaf ?? !parentIds.has(c.id));
        if (allowedCategoryTypes.length > 0) {
            leaves = leaves.filter(
                (c) => c.supplier_type && allowedCategoryTypes.includes(c.supplier_type)
            );
        }
        return leaves;
    }, [categories, allowedCategoryTypes]);

    const searchIndex = useMemo(() => {
        return leafCategories.map((cat) => ({
            ...cat,
            full_path_en: cat.full_path_en ?? getFullPath(cat.id, 'en'),
            full_path_ar: cat.full_path_ar ?? getFullPath(cat.id, 'ar'),
        }));
    }, [leafCategories, getFullPath]);

    const fuse = useMemo(
        () =>
            new Fuse(searchIndex, {
                keys: ['code', 'name_en', 'name_ar', 'full_path_en', 'full_path_ar'],
                threshold: 0.4,
                ignoreLocation: true,
            }),
        [searchIndex]
    );

    const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

    const inputSignature = `${supplierType}|${legalNameEn}|${legalNameAr}|${tradeName}|${website}`;
    const [debouncedSignature, setDebouncedSignature] = useState(inputSignature);
    const inputsRef = useRef({ legalNameEn, legalNameAr, tradeName, website });
    inputsRef.current = { legalNameEn, legalNameAr, tradeName, website };

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSignature(inputSignature), DEBOUNCE_MS);
        return () => clearTimeout(t);
    }, [inputSignature]);

    useEffect(() => {
        const { legalNameEn: en, legalNameAr: ar, tradeName: tn, website: w } = inputsRef.current;

        if (selectedSet.size >= DISABLE_SUGGESTIONS_WHEN_SELECTED_AT_LEAST) {
            setSuggested([]);
            return;
        }

        const hasCompanyName =
            (en && en.trim().length >= MIN_LEGAL_NAME_LEN) ||
            (tn && tn.trim().length >= MIN_TRADE_NAME_LEN);

        if (!hasCompanyName) {
            setSuggested([]);
            return;
        }

        const cacheKey = getCacheKey(
            [debouncedSignature, [...selectedIds].sort().join(',')].join('|')
        );
        const cached = getCached(cacheKey);
        if (cached !== undefined) {
            setSuggested(cached);
            return;
        }

        const keywords = extractKeywords(en, ar, tn, w);
        if (keywords.length === 0 || leafCategories.length === 0) {
            setSuggested([]);
            return;
        }

        const scored = new Map<string, number>();
        const matchedKeywordsMap = new Map<string, Set<string>>();
        const query = keywords.filter((k) => k.length >= 2).join(' ');
        if (!query) {
            setSuggested([]);
            return;
        }

        const results = fuse.search(query);
        for (let i = 0; i < results.length; i++) {
            const id = results[i].item.id;
            if (selectedSet.has(id)) continue;
            const fuseScore = results[i].score ?? 1;
            const rank = 1 / (i + 1);
            const contribution = rank * (1 - fuseScore);
            scored.set(id, (scored.get(id) ?? 0) + contribution);
            matchedKeywordsMap.set(id, new Set(keywords));
        }

        const maxScore = Math.max(...scored.values(), 1);
        const withNormalizedScore = [...scored.entries()].map(([id, raw]) => ({
            id,
            score: raw / maxScore,
            matchedKeywords: [...(matchedKeywordsMap.get(id) ?? [])],
        }));

        const sorted = withNormalizedScore
            .sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score;
                return a.id.localeCompare(b.id);
            })
            .slice(0, MAX_SUGGESTIONS);

        setCached(cacheKey, sorted);
        setSuggested(sorted);
    }, [debouncedSignature, fuse, selectedSet, selectedIds, leafCategories.length]);

    useEffect(() => {
        if (aiDebounceRef.current) {
            clearTimeout(aiDebounceRef.current);
            aiDebounceRef.current = null;
        }
        if (!legalNameEn && !tradeName) {
            setAiSuggestionIds([]);
            return () => {};
        }
        const cacheKey = `${supplierType}|${legalNameEn}|${legalNameAr}|${tradeName}|${website}`;
        if (AI_CACHE.has(cacheKey)) {
            setAiSuggestionIds(AI_CACHE.get(cacheKey)!);
            return () => {};
        }
        aiDebounceRef.current = setTimeout(async () => {
            setAiLoading(true);
            try {
                const res = await fetch('/api/category-suggestions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-XSRF-TOKEN': getCsrfToken(),
                    },
                    body: JSON.stringify({
                        supplier_type: supplierType,
                        legal_name_en: legalNameEn,
                        legal_name_ar: legalNameAr,
                        trade_name: tradeName,
                        website,
                    }),
                });
                if (!res.ok) throw new Error('AI request failed');
                const data = (await res.json()) as { suggested_category_ids?: string[] };
                const ids: string[] = data.suggested_category_ids ?? [];
                AI_CACHE.set(cacheKey, ids);
                setAiSuggestionIds(ids);
            } catch {
                setAiSuggestionIds([]);
            } finally {
                setAiLoading(false);
            }
        }, AI_DEBOUNCE_MS);
        return () => {
            if (aiDebounceRef.current) clearTimeout(aiDebounceRef.current);
        };
    }, [legalNameEn, legalNameAr, tradeName, supplierType, website]);

    const mergedSuggestions = useMemo(() => {
        const localIds = suggested.map((s) => s.id);
        const mergedIds = [
            ...aiSuggestionIds,
            ...localIds.filter((id) => !aiSuggestionIds.includes(id)),
        ].slice(0, MAX_SUGGESTIONS);
        return mergedIds.map((id) => {
            const local = suggested.find((s) => s.id === id);
            if (local) return local;
            const cat = categoryMap.get(id);
            return {
                id,
                score: 1,
                matchedKeywords: cat ? [cat.name_en] : [],
            };
        });
    }, [aiSuggestionIds, suggested, categoryMap]);

    return {
        suggestions: mergedSuggestions,
        aiSuggestionIds,
        isAiLoading: aiLoading,
    };
}
