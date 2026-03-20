import { useMemo, useCallback } from 'react';

export interface CategoryOption {
    id: string;
    code: string;
    name_en: string;
    name_ar: string;
    parent_id: string | null;
    level?: number;
    is_leaf?: boolean;
    full_path_en?: string;
    full_path_ar?: string;
}

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

export interface CategoryIndex {
    categoryMap: Map<string, CategoryOption>;
    childrenMap: Map<string | null, CategoryOption[]>;
    leafCategoryList: CategoryOption[];
    rootCategories: CategoryOption[];
    getFullPath: (id: string, locale: 'en' | 'ar') => string;
    getRootId: (id: string) => string | null;
    getAncestorIds: (id: string) => string[];
}

export function useCategoryIndex(categories: CategoryOption[]): CategoryIndex {
    const categoryMap = useMemo(
        () => new Map(categories.map((c) => [c.id, c])),
        [categories]
    );

    const childrenMap = useMemo(() => {
        const m = new Map<string | null, CategoryOption[]>();
        for (const c of categories) {
            const pid = c.parent_id ?? null;
            if (!m.has(pid)) m.set(pid, []);
            m.get(pid)!.push(c);
        }
        return m;
    }, [categories]);

    const leafCategoryList = useMemo(() => {
        const parentIds = new Set(categories.map((c) => c.parent_id).filter(Boolean));
        return categories.filter((c) => c.is_leaf ?? !parentIds.has(c.id));
    }, [categories]);

    const rootCategories = useMemo(
        () => (childrenMap.get(null) ?? []),
        [childrenMap]
    );

    const getFullPath = useCallback(
        (id: string, locale: 'en' | 'ar') => {
            const cat = categoryMap.get(id);
            const precomputed = locale === 'ar' ? cat?.full_path_ar : cat?.full_path_en;
            if (precomputed != null && precomputed !== '') return precomputed;
            return buildFullPath(id, categoryMap, locale);
        },
        [categoryMap]
    );

    const getRootId = useCallback(
        (id: string): string | null => {
            let cur = categoryMap.get(id);
            while (cur?.parent_id) {
                cur = categoryMap.get(cur.parent_id);
            }
            return cur?.id ?? null;
        },
        [categoryMap]
    );

    const getAncestorIds = useCallback(
        (id: string): string[] => {
            const ancestors: string[] = [];
            let cur = categoryMap.get(id);
            while (cur?.parent_id) {
                ancestors.push(cur.parent_id);
                cur = categoryMap.get(cur.parent_id);
            }
            return ancestors;
        },
        [categoryMap]
    );

    return {
        categoryMap,
        childrenMap,
        leafCategoryList,
        rootCategories,
        getFullPath,
        getRootId,
        getAncestorIds,
    };
}
