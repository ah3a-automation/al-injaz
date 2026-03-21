import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { useLocale } from '@/hooks/useLocale';
import type { TaskLinkableSearchItem } from '@/types';
import type { TaskLinkTypeKey } from '@/lib/taskLinks';
import { X } from 'lucide-react';
import { useCallback, useEffect, useState, type ReactElement } from 'react';

interface TaskLinkablePickerProps {
    linkType: TaskLinkTypeKey;
    selectedId: string;
    selectedLabel: string;
    onPick: (id: string, label: string) => void;
    onClear: () => void;
}

export function TaskLinkablePicker({
    linkType,
    selectedId,
    selectedLabel,
    onPick,
    onClear,
}: TaskLinkablePickerProps): ReactElement {
    const { t } = useLocale('tasks');
    const [query, setQuery] = useState('');
    const [debounced, setDebounced] = useState('');
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<TaskLinkableSearchItem[]>([]);

    useEffect(() => {
        const id = setTimeout(() => setDebounced(query.trim()), 300);
        return () => clearTimeout(id);
    }, [query]);

    const fetchResults = useCallback(
        async (q: string) => {
            if (q.length < 1) {
                setResults([]);
                return;
            }
            setLoading(true);
            try {
                const raw = route('tasks.linkables.search');
                const base =
                    typeof raw === 'string' && raw.startsWith('http')
                        ? new URL(raw)
                        : new URL(raw, window.location.origin);
                base.searchParams.set('type', linkType);
                base.searchParams.set('q', q);
                const res = await fetch(base.toString(), {
                    headers: {
                        Accept: 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                    credentials: 'same-origin',
                });
                if (!res.ok) {
                    setResults([]);
                    return;
                }
                const json = (await res.json()) as { data: TaskLinkableSearchItem[] };
                setResults(Array.isArray(json.data) ? json.data : []);
            } catch {
                setResults([]);
            } finally {
                setLoading(false);
            }
        },
        [linkType]
    );

    useEffect(() => {
        if (debounced.length < 1) {
            setResults([]);
            return;
        }
        void fetchResults(debounced);
    }, [debounced, fetchResults]);

    useEffect(() => {
        setQuery('');
        setDebounced('');
        setResults([]);
        setOpen(false);
    }, [linkType]);

    const hasSelection = selectedId.trim() !== '';

    if (hasSelection) {
        return (
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-input bg-muted/20 px-2 py-1.5 text-sm">
                <span className="min-w-0 flex-1 truncate" title={selectedLabel || selectedId}>
                    {selectedLabel || selectedId}
                </span>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={onClear}
                    aria-label={t('link_clear_selection')}
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>
        );
    }

    return (
        <div className="relative min-w-0 flex-1">
            <Input
                value={query}
                onChange={(e) => {
                    setQuery(e.target.value);
                    setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                placeholder={t('link_search_placeholder')}
                autoComplete="off"
                aria-invalid={false}
            />
            {loading && (
                <p className="mt-1 text-xs text-muted-foreground">{t('link_search_loading')}</p>
            )}
            {open && !loading && debounced.length >= 1 && results.length === 0 && (
                <p className="mt-1 text-xs text-muted-foreground">{t('link_search_no_results')}</p>
            )}
            {open && results.length > 0 && (
                <ul
                    className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md"
                    role="listbox"
                >
                    {results.map((item) => (
                        <li key={item.id} role="option">
                            <button
                                type="button"
                                className="flex w-full flex-col items-start gap-0.5 rounded-sm px-2 py-1.5 text-start text-sm hover:bg-accent"
                                onClick={() => {
                                    onPick(item.id, item.label);
                                    setQuery('');
                                    setOpen(false);
                                    setResults([]);
                                }}
                            >
                                <span className="font-medium leading-tight">{item.label}</span>
                                {item.status != null && item.status !== '' && (
                                    <span className="text-xs text-muted-foreground">{item.status}</span>
                                )}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
