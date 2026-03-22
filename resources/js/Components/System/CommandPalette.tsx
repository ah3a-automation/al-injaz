import {
    Dialog,
    DialogPanel,
    Transition,
    TransitionChild,
} from '@headlessui/react';
import { router } from '@inertiajs/react';
import {
    Building2,
    ChevronRight,
    FileText,
    FolderKanban,
    Loader2,
    Plus,
    Search,
    Settings,
    Star,
    Clock,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Input } from '@/Components/ui/input';
import SearchPreview from '@/Components/System/SearchPreview';
import { useLocale } from '@/hooks/useLocale';
import type {
    GlobalSearchResponse,
    GlobalSearchItem,
    GlobalSearchRecentOrFavorite,
    GlobalSearchCommand,
} from '@/types';

const DEBOUNCE_MS = 300;
const SEARCH_URL = '/search';
const MIN_QUERY_LENGTH = 2;

type FlatEntry =
    | { kind: 'favorite'; data: GlobalSearchRecentOrFavorite }
    | { kind: 'recent'; data: GlobalSearchRecentOrFavorite }
    | { kind: 'command'; data: GlobalSearchCommand }
    | { kind: 'result'; data: GlobalSearchItem; group: string };

function iconFor(name: string) {
    switch (name) {
        case 'folder':
        case 'project':
            return FolderKanban;
        case 'building':
        case 'supplier':
            return Building2;
        case 'file-text':
        case 'rfq':
            return FileText;
        case 'settings':
            return Settings;
        case 'plus':
            return Plus;
        default:
            return ChevronRight;
    }
}

/**
 * Highlight matched substring in label (case-insensitive). Returns array of segments.
 */
export function highlightMatch(label: string, query: string): React.ReactNode {
    if (!query || query.length === 0) return label;
    const lower = label.toLowerCase();
    const q = query.toLowerCase();
    const idx = lower.indexOf(q);
    if (idx === -1) return label;
    return (
        <>
            {label.slice(0, idx)}
            <mark className="bg-primary/20 font-medium rounded px-0.5">{label.slice(idx, idx + q.length)}</mark>
            {label.slice(idx + q.length)}
        </>
    );
}

/** Parse prefix from query for display/highlighting: "project: foo" → "foo" */
function searchTermWithoutPrefix(q: string): string {
    const m = q.match(/^(project|supplier|rfq):\s*(.*)$/i);
    return m ? m[2].trim() : q.trim();
}

interface CommandPaletteProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export default function CommandPalette({ open: controlledOpen, onOpenChange }: CommandPaletteProps = {}) {
    const { t } = useLocale('ui');
    const sectionLabel = useCallback((entry: FlatEntry): string | null => {
        if (entry.kind === 'favorite') return t('command_section_favorites');
        if (entry.kind === 'recent') return t('command_section_recent');
        if (entry.kind === 'command') return t('command_section_commands');
        if (entry.kind === 'result') {
            switch (entry.group) {
                case 'projects':
                    return t('command_section_projects');
                case 'suppliers':
                    return t('command_section_suppliers');
                case 'rfqs':
                    return t('command_section_rfqs');
                case 'contracts':
                    return t('command_section_contracts');
                case 'settings':
                    return t('command_section_settings');
                default:
                    return null;
            }
        }
        return null;
    }, [t]);

    const sectionIcon = useCallback((entry: FlatEntry) => {
        if (entry.kind === 'favorite') return Star;
        if (entry.kind === 'recent') return Clock;
        if (entry.kind === 'command') return Plus;
        if (entry.kind === 'result') {
            switch (entry.group) {
                case 'projects':
                    return FolderKanban;
                case 'suppliers':
                    return Building2;
                case 'rfqs':
                    return FileText;
                case 'settings':
                    return Settings;
                case 'contracts':
                default:
                    return iconFor((entry.data as GlobalSearchItem).icon);
            }
        }
        return ChevronRight;
    }, []);

    const [internalOpen, setInternalOpen] = useState(false);
    const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
    const setOpen = useCallback(
        (value: boolean) => {
            if (onOpenChange) onOpenChange(value);
            else setInternalOpen(value);
        },
        [onOpenChange]
    );
    const [q, setQ] = useState('');
    const [debouncedQ, setDebouncedQ] = useState('');
    const [data, setData] = useState<GlobalSearchResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const t = setTimeout(() => setDebouncedQ(q), DEBOUNCE_MS);
        return () => clearTimeout(t);
    }, [q]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            const isK = e.key === 'k' || e.key === 'K';
            // Cmd+K (macOS) or Ctrl+K (Windows/Linux); Shift+Ctrl+K ignored
            if (isK && (e.metaKey || (e.ctrlKey && !e.shiftKey))) {
                e.preventDefault();
                setOpen(!open);
                if (!open) {
                    setQ('');
                    setSelectedIndex(0);
                    setData(null);
                }
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [open, setOpen]);

    useEffect(() => {
        if (!open) return;

        setQ('');
        setSelectedIndex(0);

        requestAnimationFrame(() => {
            inputRef.current?.focus();
            inputRef.current?.select();
        });
    }, [open]);

    const shouldFetch = open && (debouncedQ === '' || debouncedQ.length >= MIN_QUERY_LENGTH);

    useEffect(() => {
        if (!shouldFetch) {
            if (debouncedQ.length > 0 && debouncedQ.length < MIN_QUERY_LENGTH) {
                setData(null);
            }
            return;
        }
        setLoading(true);
        fetch(`${SEARCH_URL}?q=${encodeURIComponent(debouncedQ)}`, {
            headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            credentials: 'same-origin',
        })
            .then((res) => res.json())
            .then((json: GlobalSearchResponse) => {
                setData(json);
                setSelectedIndex(0);
            })
            .catch(() => setData(null))
            .finally(() => setLoading(false));
    }, [shouldFetch, debouncedQ]);

    // Flatten: favorites → recent → commands → projects → suppliers → rfqs → contracts → settings
    const flatList = useMemo((): FlatEntry[] => {
        if (!data) return [];
        const list: FlatEntry[] = [];
        if (debouncedQ === '') {
            list.push(...data.favorites.map((f) => ({ kind: 'favorite' as const, data: f })));
            list.push(...data.recent.map((r) => ({ kind: 'recent' as const, data: r })));
        }
        (data.commands ?? []).forEach((c) => list.push({ kind: 'command' as const, data: c }));
        list.push(...data.results.projects.map((p) => ({ kind: 'result' as const, data: p, group: 'projects' })));
        list.push(...data.results.suppliers.map((s) => ({ kind: 'result' as const, data: s, group: 'suppliers' })));
        list.push(...data.results.rfqs.map((r) => ({ kind: 'result' as const, data: r, group: 'rfqs' })));
        list.push(...data.results.contracts.map((c) => ({ kind: 'result' as const, data: c, group: 'contracts' })));
        list.push(...data.results.settings.map((s) => ({ kind: 'result' as const, data: s, group: 'settings' })));
        return list;
    }, [data, debouncedQ]);

    const selectedEntry = flatList[selectedIndex] ?? null;
    const highlightQuery = searchTermWithoutPrefix(debouncedQ);

    useEffect(() => {
        if (selectedIndex >= flatList.length && flatList.length > 0) {
            setSelectedIndex(flatList.length - 1);
        }
        if (selectedIndex < 0) setSelectedIndex(0);
    }, [selectedIndex, flatList.length]);

    useEffect(() => {
        if (!open) return;
        const list = listRef.current;
        if (!list) return;
        const selected = list.querySelector<HTMLButtonElement>(`[data-cmd-index="${selectedIndex}"]`);
        selected?.scrollIntoView({ block: 'nearest' });
    }, [open, selectedIndex, flatList.length]);

    const favoriteKeyToId = useMemo(() => {
        const map = new Map<string, number>();
        (data?.favorites ?? []).forEach((f) => map.set(`${f.type}-${f.model_id}`, f.id));
        return map;
    }, [data?.favorites]);

    const isFavorite = useCallback(
        (entry: FlatEntry): boolean => {
            if (entry.kind === 'command') return false;
            const key = entry.kind === 'result' ? `${entry.data.type}-${entry.data.id}` : `${entry.data.type}-${entry.data.model_id}`;
            return favoriteKeyToId.has(key);
        },
        [favoriteKeyToId]
    );

    const getFavoriteId = useCallback(
        (entry: FlatEntry): number | null => {
            if (entry.kind === 'command') return null;
            const key = entry.kind === 'result' ? `${entry.data.type}-${entry.data.id}` : `${entry.data.type}-${entry.data.model_id}`;
            return favoriteKeyToId.get(key) ?? null;
        },
        [favoriteKeyToId]
    );

    const recordRecent = useCallback((item: GlobalSearchItem | GlobalSearchRecentOrFavorite) => {
        const url = item.url ?? '';
        const type = item.type;
        const model_id = 'model_id' in item ? item.model_id : (item as GlobalSearchItem).id;
        fetch(SEARCH_URL + '/recent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            credentials: 'same-origin',
            body: JSON.stringify({ type, model_id, label: item.label, url }),
        }).catch(() => {});
    }, []);

    const navigateTo = useCallback(
        (url: string, entry: FlatEntry, newTab = false) => {
            if (entry.kind !== 'command') {
                recordRecent(entry.data as GlobalSearchItem | GlobalSearchRecentOrFavorite);
            }
            setOpen(false);
            if (newTab) {
                window.open(url, '_blank', 'noopener,noreferrer');
            } else {
                router.visit(url);
            }
        },
        [recordRecent, setOpen]
    );

    const toggleFavorite = useCallback(
        (e: React.MouseEvent, entry: FlatEntry) => {
            e.preventDefault();
            e.stopPropagation();
            if (entry.kind === 'command') return;
            const favId = getFavoriteId(entry);
            const item = entry.data;
            const type = item.type;
            const model_id = 'model_id' in item ? item.model_id : (item as GlobalSearchItem).id;
            const url = item.url;
            const label = item.label;
            const csrf = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';

            if (favId != null) {
                fetch(`${SEARCH_URL}/favorites/${favId}`, {
                    method: 'DELETE',
                    headers: { Accept: 'application/json', 'X-CSRF-TOKEN': csrf, 'X-Requested-With': 'XMLHttpRequest' },
                    credentials: 'same-origin',
                }).then(() => {
                    setData((prev) => {
                        if (!prev) return prev;
                        return { ...prev, favorites: prev.favorites.filter((f) => f.id !== favId) };
                    });
                }).catch(() => {});
            } else {
                fetch(SEARCH_URL + '/favorites', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        'X-CSRF-TOKEN': csrf,
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                    credentials: 'same-origin',
                    body: JSON.stringify({ type, model_id, label, url }),
                }).then(() => {
                    fetch(`${SEARCH_URL}?q=${encodeURIComponent(debouncedQ)}`, {
                        headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                        credentials: 'same-origin',
                    })
                        .then((r) => r.json())
                        .then((json: GlobalSearchResponse) => setData(json))
                        .catch(() => {});
                }).catch(() => {});
            }
        },
        [getFavoriteId]
    );

    const handleContainerKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex((i) => Math.min(i + 1, Math.max(0, flatList.length - 1)));
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex((i) => Math.max(i - 1, 0));
                return;
            }
            if (e.key === 'Enter' && selectedEntry) {
                e.preventDefault();
                const url = selectedEntry.data.url;
                if (e.ctrlKey || e.metaKey) {
                    navigateTo(url, selectedEntry, true);
                } else {
                    navigateTo(url, selectedEntry, false);
                }
                return;
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                setOpen(false);
                return;
            }
            const num = e.key >= '1' && e.key <= '9' ? parseInt(e.key, 10) : 0;
            if ((e.ctrlKey || e.metaKey) && num >= 1 && num <= 9) {
                e.preventDefault();
                const idx = num - 1;
                if (idx < flatList.length) {
                    const entry = flatList[idx];
                    navigateTo(entry.data.url, entry, false);
                }
            }
        },
        [flatList, selectedEntry, navigateTo, setOpen]
    );

    const stableKey = (entry: FlatEntry, idx: number): string => {
        const d = entry.data;
        if (entry.kind === 'result') return `${d.type}-${d.id}`;
        if (entry.kind === 'command') return `command-${d.id}-${idx}`;
        const id = 'model_id' in d ? d.model_id : (d as GlobalSearchItem).id;
        return `${entry.kind}-${d.type}-${id}-${idx}`;
    };

    const previewItem = selectedEntry
        ? selectedEntry.kind === 'result'
            ? (selectedEntry.data as GlobalSearchItem)
            : selectedEntry.kind === 'command'
              ? { ...selectedEntry.data, type: 'command' as const }
              : (selectedEntry.data as GlobalSearchRecentOrFavorite)
        : null;
    const previewType = selectedEntry?.kind === 'command' ? 'command' : selectedEntry?.kind === 'recent' ? 'recent' : selectedEntry?.kind === 'favorite' ? 'favorite' : 'result';

    return (
        <>
            <Transition show={open} leave="duration-200">
                <Dialog
                    as="div"
                    className="fixed inset-0 z-[2100] flex transform items-start justify-center pt-[12vh] transition-all"
                    onClose={() => setOpen(false)}
                    initialFocus={inputRef}
                >
                    <TransitionChild
                        enter="ease-out duration-200"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-150"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 z-[2090] bg-black/40" aria-hidden="true" />
                    </TransitionChild>

                    <TransitionChild
                        enter="ease-out duration-200"
                        enterFrom="opacity-0 scale-95"
                        enterTo="opacity-100 scale-100"
                        leave="ease-in duration-150"
                        leaveFrom="opacity-100 scale-100"
                        leaveTo="opacity-0 scale-95"
                    >
                        <DialogPanel
                            className="relative z-[2100] flex w-full max-w-4xl overflow-hidden rounded-lg border border-border bg-card shadow-xl"
                            onKeyDown={handleContainerKeyDown}
                            tabIndex={-1}
                        >
                            <div className="flex min-w-0 flex-1 flex-col">
                                <div className="flex items-center border-b border-border px-3">
                                    <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                                    <Input
                                        ref={inputRef}
                                        type="text"
                                        value={q}
                                        onChange={(e) => setQ(e.target.value)}
                                        placeholder={t('command_placeholder')}
                                        className="h-12 flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none"
                                        aria-label={t('command_global_search_aria')}
                                    />
                                </div>

                                <div
                                    ref={listRef}
                                    className="max-h-[70vh] min-h-[200px] overflow-y-auto p-2"
                                    role="listbox"
                                    aria-label={t('command_results_aria')}
                                >
                                    {loading && (
                                        <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            {t('command_searching')}
                                        </div>
                                    )}
                                    {!loading && shouldFetch && data && flatList.length === 0 && (
                                        <div className="py-8 text-center text-sm text-muted-foreground">
                                            {debouncedQ === '' ? t('command_hint') : t('command_no_results')}
                                        </div>
                                    )}
                                    {!loading && !shouldFetch && debouncedQ.length > 0 && debouncedQ.length < MIN_QUERY_LENGTH && (
                                        <div className="py-8 text-center text-sm text-muted-foreground">
                                            {t('command_min_chars', undefined, { min: MIN_QUERY_LENGTH })}
                                        </div>
                                    )}
                                    {!loading && data && flatList.length > 0 && (
                                        <>
                                            {flatList.map((entry, idx) => {
                                                const label = sectionLabel(entry);
                                                const prevLabel = idx > 0 ? sectionLabel(flatList[idx - 1]) : null;
                                                const showSection = label !== prevLabel;
                                                const url = entry.data.url;
                                                const itemLabel = entry.data.label;
                                                const desc =
                                                    entry.kind === 'result'
                                                        ? (entry.data as GlobalSearchItem).breadcrumbs ?? (entry.data as GlobalSearchItem).description
                                                        : entry.kind === 'command'
                                                          ? (entry.data as GlobalSearchCommand).description
                                                          : '';
                                                const Icon = entry.kind === 'result' ? iconFor((entry.data as GlobalSearchItem).icon) : iconFor(entry.data.icon);
                                                const SectionIcon = sectionIcon(entry);
                                                const canStar = entry.kind === 'favorite' || entry.kind === 'recent' || (entry.kind === 'result' && (entry.data as GlobalSearchItem).type !== 'settings');
                                                const starred = canStar && isFavorite(entry);

                                                return (
                                                    <div key={stableKey(entry, idx)}>
                                                        {showSection && label && (
                                                            <div className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-muted-foreground">
                                                                <SectionIcon className="h-3.5 w-3.5 shrink-0" />
                                                                {label}
                                                            </div>
                                                        )}
                                                        <button
                                                            type="button"
                                                            role="option"
                                                            data-cmd-index={idx}
                                                            aria-selected={selectedIndex === idx}
                                                            className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${selectedIndex === idx ? 'bg-muted' : 'hover:bg-muted/70'}`}
                                                            onClick={() => navigateTo(url, entry)}
                                                        >
                                                            <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                                                            <div className="min-w-0 flex-1">
                                                                <div className="truncate">
                                                                    {highlightQuery ? highlightMatch(itemLabel, highlightQuery) : itemLabel}
                                                                </div>
                                                                {desc && (
                                                                    <div className="truncate text-xs text-muted-foreground">{desc}</div>
                                                                )}
                                                            </div>
                                                            {canStar && (
                                                        <div
                                                            role="button"
                                                            aria-label={starred ? t('command_remove_favorite') : t('command_add_favorite')}
                                                            className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                                                            onClick={(e) => toggleFavorite(e, entry)}
                                                        >
                                                            <Star className={`h-4 w-4 ${starred ? 'fill-amber-400 text-amber-500' : ''}`} />
                                                        </div>
                                                            )}
                                                            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </>
                                    )}
                                </div>

                                <div className="border-t border-border px-3 py-2 text-[10px] text-muted-foreground">
                                    {t('command_footer_shortcuts')}
                                </div>
                            </div>

                            <div className="hidden w-[320px] shrink-0 border-l border-border bg-muted/30 md:block">
                                <SearchPreview item={previewItem as GlobalSearchItem | GlobalSearchRecentOrFavorite | null} type={previewType} />
                            </div>
                        </DialogPanel>
                    </TransitionChild>
                </Dialog>
            </Transition>
        </>
    );
}
