'use client';

import { Loader2, Plus } from 'lucide-react';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import type { CategoryOption } from './useCategoryIndex';
import type { CategorySuggestion } from '@/hooks/useCategorySuggestions';
import { useLocale } from '@/hooks/useLocale';

function confidenceLabel(score: number): 'High' | 'Medium' | 'Low' {
    if (score >= 0.75) return 'High';
    if (score >= 0.5) return 'Medium';
    return 'Low';
}

export interface CategorySuggestionsProps {
    categories: CategoryOption[];
    suggestedCategories: CategorySuggestion[];
    selectedIds: string[];
    locale: 'en' | 'ar';
    maxSelections: number;
    onAddCategory: (id: string) => void;
    getFullPath: (id: string, locale: 'en' | 'ar') => string;
    aiSuggestionIds?: string[];
    isAiLoading?: boolean;
}

export function CategorySuggestions({
    categories,
    suggestedCategories,
    selectedIds,
    locale,
    maxSelections,
    onAddCategory,
    getFullPath,
    aiSuggestionIds = [],
    isAiLoading = false,
}: CategorySuggestionsProps) {
    const { t } = useLocale();
    const selectedSet = new Set(selectedIds);
    const categoryMap = new Map(categories.map((c) => [c.id, c]));

    const toShow = suggestedCategories
        .filter((s) => !selectedSet.has(s.id))
        .slice(0, 5);

    const suggestionsDisabled = selectedIds.length >= 5;
    const atMax = selectedIds.length >= maxSelections;

    return (
        <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
                {t('suggested_categories_title', 'supplier_portal')}
            </p>
            <p className="text-xs text-muted-foreground">
                {t('suggested_by_system', 'supplier_portal')}
            </p>
            {isAiLoading && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                    <Loader2 className="h-3 w-3 animate-spin text-primary" />
                    <span>{t('ai_analyzing', 'supplier_portal')}</span>
                </div>
            )}
            {suggestionsDisabled ? (
                <div className="rounded-md border border-border bg-muted/20 p-3 text-sm text-muted-foreground">
                    {t('suggestions_disabled_message', 'supplier_portal').replace(':count', String(selectedIds.length))}
                </div>
            ) : toShow.length === 0 ? null : (
            <div className="flex flex-wrap gap-2">
                {toShow.map((suggestion) => {
                    const cat = categoryMap.get(suggestion.id);
                    if (!cat) return null;
                    const label =
                        getFullPath(suggestion.id, locale) ||
                        (locale === 'ar' ? cat.name_ar : cat.name_en);
                    const disabled = atMax;
                    const confidence = confidenceLabel(suggestion.score);
                    const hasKeywords =
                        suggestion.matchedKeywords && suggestion.matchedKeywords.length > 0;

                    return (
                        <div
                            key={suggestion.id}
                            className="flex flex-col gap-1 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm"
                        >
                            <div className="flex items-center gap-2">
                                <span
                                    className="min-w-0 max-w-[240px] truncate"
                                    title={label}
                                >
                                    {label}
                                </span>
                                {aiSuggestionIds.includes(suggestion.id) && (
                                    <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                                        AI
                                    </span>
                                )}
                                <Badge
                                    variant="secondary"
                                    className="shrink-0 text-xs font-normal"
                                >
                                    {confidence} confidence
                                </Badge>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="ml-auto h-7 shrink-0 gap-1 px-2 text-xs"
                                    onClick={() =>
                                        !disabled && onAddCategory(suggestion.id)
                                    }
                                    disabled={disabled}
                                    aria-label={`Add ${label}`}
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    Add
                                </Button>
                            </div>
                            {hasKeywords && (
                                <p className="text-xs text-muted-foreground">
                                    matched: {suggestion.matchedKeywords.join(', ')}
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>
            )}
        </div>
    );
}
