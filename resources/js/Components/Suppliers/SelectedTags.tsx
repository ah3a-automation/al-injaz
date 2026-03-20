'use client';

import { X } from 'lucide-react';
import type { CategoryOption } from './useCategoryIndex';

interface SelectedTagsProps {
    value: string[];
    categoryMap: Map<string, CategoryOption>;
    locale: 'en' | 'ar';
    onRemove: (id: string) => void;
    maxSelections: number;
}

export function SelectedTags({
    value,
    categoryMap,
    locale,
    onRemove,
    maxSelections,
}: SelectedTagsProps) {
    if (value.length === 0) return null;

    return (
        <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">
                Selected {value.length > 0 && `(${value.length}${value.length >= maxSelections ? ` / ${maxSelections} max` : ''})`}
            </div>
            <div className="flex max-h-24 flex-wrap gap-2 overflow-y-auto overflow-x-hidden rounded-md border border-border/50 bg-muted/20 p-1.5">
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
                            <span className="max-w-[220px] truncate" title={label}>
                                {label}
                            </span>
                            {code && (
                                <span className="shrink-0 font-mono text-muted-foreground text-[10px]">
                                    {code}
                                </span>
                            )}
                            <button
                                type="button"
                                onClick={() => onRemove(id)}
                                className="rounded p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                aria-label="Remove category"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </span>
                    );
                })}
            </div>
        </div>
    );
}
