import { Button } from '@/Components/ui/button';
import { Checkbox } from '@/Components/ui/checkbox';
import { Label } from '@/Components/ui/label';
import { useLocale } from '@/hooks/useLocale';
import {
    ChevronDown,
    ChevronUp,
    Copy,
    Heading2,
    List,
    ListOrdered,
    Plus,
    TextQuote,
    Trash2,
    Type,
} from 'lucide-react';
import { useCallback } from 'react';

export interface ArticleOptionRow {
    key: string;
    title_en?: string;
    title_ar?: string;
    body_en: string;
    body_ar: string;
}

export interface ArticleBlock {
    id: string;
    type: string;
    sort_order: number;
    title_en?: string;
    title_ar?: string;
    body_en: string;
    body_ar: string;
    variable_keys?: string[];
    risk_tags?: string[];
    is_internal?: boolean;
    options?: ArticleOptionRow[] | null;
    version?: number | string;
    /** Opaque key/value bag for persistence; JSON-serializable scalars only (Inertia form typing). */
    meta?: Record<string, string | number | boolean | null>;
}

interface ArticleBlockEditorProps {
    blocks: ArticleBlock[];
    onChange: (blocks: ArticleBlock[]) => void;
    blockTypes: string[];
    allowedRiskTags: string[];
    variableKeysCatalog: string[];
    disabled?: boolean;
}

function nextOptionKeys(count: number): string[] {
    const keys: string[] = [];
    for (let i = 0; i < count; i++) {
        if (i < 26) {
            keys.push(String.fromCharCode(65 + i));
        } else {
            keys.push(`O${i + 1}`);
        }
    }
    return keys;
}

function newOptionRow(key: string): ArticleOptionRow {
    return {
        key,
        title_en: '',
        title_ar: '',
        body_en: '',
        body_ar: '',
    };
}

export function createEmptyBlock(type: string, sortOrder: number): ArticleBlock {
    const base: ArticleBlock = {
        id: crypto.randomUUID(),
        type,
        sort_order: sortOrder,
        title_en: '',
        title_ar: '',
        body_en: '',
        body_ar: '',
        variable_keys: [],
        risk_tags: [],
        is_internal: false,
        options: null,
    };
    if (type === 'option') {
        const keys = nextOptionKeys(2);
        base.options = [newOptionRow(keys[0]), newOptionRow(keys[1])];
    }
    return base;
}

function sortByOrder(blocks: ArticleBlock[]): ArticleBlock[] {
    return [...blocks].sort((a, b) => a.sort_order - b.sort_order);
}

function riskTagLabelKey(tag: string): `risk_tag_${string}` {
    return `risk_tag_${tag}` as `risk_tag_${string}`;
}

function wrapSelection(value: string, start: number, end: number, before: string, after: string): string {
    const sel = value.slice(start, end);
    return value.slice(0, start) + before + sel + after + value.slice(end);
}

interface BodyFieldProps {
    blockId: string;
    lang: 'en' | 'ar';
    value: string;
    onChange: (v: string) => void;
    label: string;
    hint: string;
    disabled?: boolean;
}

function BodyField({ blockId, lang, value, onChange, label, hint, disabled }: BodyFieldProps) {
    const { t } = useLocale('contract_articles');
    const apply = (before: string, after: string) => {
        const ta = document.getElementById(`${blockId}-body-${lang}`) as HTMLTextAreaElement | null;
        if (!ta) return;
        const s = ta.selectionStart ?? 0;
        const e = ta.selectionEnd ?? 0;
        onChange(wrapSelection(value, s, e, before, after));
        requestAnimationFrame(() => {
            ta.focus();
            const pos = s + before.length + (e - s) + after.length;
            ta.setSelectionRange(pos, pos);
        });
    };

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <Label htmlFor={`${blockId}-body-${lang}`}>{label}</Label>
                <div
                    className="flex flex-wrap gap-1"
                    role="toolbar"
                    aria-label={t('blocks_formatting_tools', 'contract_articles')}
                >
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 px-2"
                        disabled={disabled}
                        onClick={() => apply('**', '**')}
                        aria-label={t('blocks_fmt_bold', 'contract_articles')}
                    >
                        <Type className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 px-2"
                        disabled={disabled}
                        onClick={() => apply('## ', '')}
                        aria-label={t('blocks_fmt_heading', 'contract_articles')}
                    >
                        <Heading2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 px-2"
                        disabled={disabled}
                        onClick={() => {
                            const ta = document.getElementById(`${blockId}-body-${lang}`) as HTMLTextAreaElement | null;
                            if (!ta) return;
                            const s = ta.selectionStart ?? 0;
                            const lineStart = value.lastIndexOf('\n', s - 1) + 1;
                            const insert = value[lineStart] === undefined || value[lineStart] === '\n' ? '- ' : '\n- ';
                            onChange(value.slice(0, s) + insert + value.slice(s));
                        }}
                        aria-label={t('blocks_fmt_bullet', 'contract_articles')}
                    >
                        <List className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 px-2"
                        disabled={disabled}
                        onClick={() => {
                            const ta = document.getElementById(`${blockId}-body-${lang}`) as HTMLTextAreaElement | null;
                            if (!ta) return;
                            const s = ta.selectionStart ?? 0;
                            const lineStart = value.lastIndexOf('\n', s - 1) + 1;
                            const insert = value[lineStart] === undefined || value[lineStart] === '\n' ? '1. ' : '\n1. ';
                            onChange(value.slice(0, s) + insert + value.slice(s));
                        }}
                        aria-label={t('blocks_fmt_numbered', 'contract_articles')}
                    >
                        <ListOrdered className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 px-2"
                        disabled={disabled}
                        onClick={() => apply('> ', '')}
                        aria-label={t('blocks_fmt_quote', 'contract_articles')}
                    >
                        <TextQuote className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>
            <p className="text-[11px] text-muted-foreground">{hint}</p>
            <textarea
                id={`${blockId}-body-${lang}`}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                rows={8}
                disabled={disabled}
                dir={lang === 'ar' ? 'rtl' : 'ltr'}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 font-mono text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
        </div>
    );
}

export function ArticleBlockEditor({
    blocks,
    onChange,
    blockTypes,
    allowedRiskTags,
    variableKeysCatalog,
    disabled = false,
}: ArticleBlockEditorProps) {
    const { t } = useLocale('contract_articles');

    const ordered = sortByOrder(blocks);

    const updateBlock = useCallback(
        (id: string, patch: Partial<ArticleBlock>) => {
            onChange(
                blocks.map((b) => (b.id === id ? { ...b, ...patch } : b))
            );
        },
        [blocks, onChange]
    );

    const reorder = useCallback(
        (fromIndex: number, toIndex: number) => {
            const sorted = sortByOrder(blocks);
            const item = sorted[fromIndex];
            if (!item) return;
            const next = sorted.filter((_, i) => i !== fromIndex);
            next.splice(toIndex, 0, item);
            onChange(
                next.map((b, i) => ({
                    ...b,
                    sort_order: i + 1,
                }))
            );
        },
        [blocks, onChange]
    );

    const removeBlock = (id: string) => {
        if (blocks.length <= 1) return;
        const filtered = blocks.filter((b) => b.id !== id);
        onChange(
            sortByOrder(filtered).map((b, i) => ({
                ...b,
                sort_order: i + 1,
            }))
        );
    };

    const duplicateBlock = (id: string) => {
        const b = blocks.find((x) => x.id === id);
        if (!b) return;
        const copy = JSON.parse(JSON.stringify(b)) as ArticleBlock;
        copy.id = crypto.randomUUID();
        copy.sort_order = blocks.length + 1;
        if (copy.type === 'option' && copy.options && copy.options.length > 0) {
            const keys = nextOptionKeys(copy.options.length);
            copy.options = copy.options.map((o, i) => ({
                ...o,
                key: keys[i] ?? `O${i + 1}`,
            }));
        }
        onChange([...blocks, copy].map((x, i) => ({ ...x, sort_order: i + 1 })));
    };

    const addBlock = () => {
        onChange([...blocks, createEmptyBlock('clause', blocks.length + 1)]);
    };

    const changeType = (id: string, type: string) => {
        const b = blocks.find((x) => x.id === id);
        if (!b) return;
        let next: ArticleBlock = { ...b, type };
        if (type === 'option') {
            const keys = nextOptionKeys(Math.max(2, b.options?.length ?? 2));
            next.options = keys.map((k) => newOptionRow(k));
        } else {
            next.options = null;
        }
        if (type !== 'note') {
            next.is_internal = false;
        }
        updateBlock(id, next);
    };

    const toggleVarKey = (blockId: string, key: string) => {
        const b = blocks.find((x) => x.id === blockId);
        if (!b) return;
        const set = new Set(b.variable_keys ?? []);
        if (set.has(key)) set.delete(key);
        else set.add(key);
        updateBlock(blockId, { variable_keys: Array.from(set) });
    };

    const toggleRisk = (blockId: string, tag: string) => {
        const b = blocks.find((x) => x.id === blockId);
        if (!b) return;
        const set = new Set(b.risk_tags ?? []);
        if (set.has(tag)) set.delete(tag);
        else set.add(tag);
        updateBlock(blockId, { risk_tags: Array.from(set) });
    };

    const updateOption = (
        blockId: string,
        optIndex: number,
        patch: Partial<ArticleOptionRow>
    ) => {
        const b = blocks.find((x) => x.id === blockId);
        if (!b || !b.options) return;
        const opts = [...b.options];
        const cur = opts[optIndex];
        if (!cur) return;
        opts[optIndex] = { ...cur, ...patch };
        updateBlock(blockId, { options: opts });
    };

    const addOption = (blockId: string) => {
        const b = blocks.find((x) => x.id === blockId);
        if (!b || !b.options) return;
        const nextKey = nextOptionKeys(b.options.length + 1)[b.options.length] ?? `O${b.options.length + 1}`;
        updateBlock(blockId, { options: [...b.options, newOptionRow(nextKey)] });
    };

    const removeOption = (blockId: string, optIndex: number) => {
        const b = blocks.find((x) => x.id === blockId);
        if (!b || !b.options || b.options.length <= 2) return;
        const opts = b.options.filter((_, i) => i !== optIndex);
        updateBlock(blockId, { options: opts });
    };

    return (
        <div className="space-y-4">
            <div className="rounded-md border border-dashed border-border bg-muted/30 p-4">
                <p className="text-sm font-medium">{t('blocks_section_title', 'contract_articles')}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t('blocks_section_help', 'contract_articles')}</p>
            </div>

            {ordered.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('blocks_empty', 'contract_articles')}</p>
            ) : null}

            {ordered.map((block, index) => (
                <div
                    key={block.id}
                    className={`rounded-lg border p-4 shadow-sm ${
                        block.is_internal ? 'border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20' : 'border-border bg-card'
                    }`}
                >
                    <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-mono text-muted-foreground">
                                {t('blocks_order_label', 'contract_articles', { n: block.sort_order })}
                            </span>
                            {block.is_internal && (
                                <span className="rounded bg-amber-200 px-2 py-0.5 text-[10px] font-medium text-amber-900">
                                    {t('blocks_internal_badge', 'contract_articles')}
                                </span>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-1">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={disabled || index === 0}
                                onClick={() => reorder(index, index - 1)}
                                aria-label={t('blocks_move_up', 'contract_articles')}
                            >
                                <ChevronUp className="h-4 w-4" />
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={disabled || index === ordered.length - 1}
                                onClick={() => reorder(index, index + 1)}
                                aria-label={t('blocks_move_down', 'contract_articles')}
                            >
                                <ChevronDown className="h-4 w-4" />
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={disabled}
                                onClick={() => duplicateBlock(block.id)}
                                aria-label={t('blocks_duplicate', 'contract_articles')}
                            >
                                <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={disabled || blocks.length <= 1}
                                onClick={() => removeBlock(block.id)}
                                aria-label={t('blocks_remove', 'contract_articles')}
                            >
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label>{t('blocks_type', 'contract_articles')}</Label>
                            <select
                                value={block.type}
                                disabled={disabled}
                                onChange={(e) => changeType(block.id, e.target.value)}
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            >
                                {blockTypes.map((bt) => (
                                    <option key={bt} value={bt}>
                                        {t(`block_type_${bt}`, 'contract_articles')}
                                    </option>
                                ))}
                            </select>
                        </div>
                        {block.type === 'note' && (
                            <div className="flex items-end gap-3 pb-1">
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        id={`internal-${block.id}`}
                                        checked={!!block.is_internal}
                                        disabled={disabled}
                                        onCheckedChange={(c) =>
                                            updateBlock(block.id, { is_internal: c === true })
                                        }
                                    />
                                    <Label htmlFor={`internal-${block.id}`} className="text-sm font-normal">
                                        {t('blocks_is_internal', 'contract_articles')}
                                    </Label>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label>{t('blocks_title_en', 'contract_articles')}</Label>
                            <input
                                type="text"
                                value={block.title_en ?? ''}
                                disabled={disabled}
                                onChange={(e) => updateBlock(block.id, { title_en: e.target.value })}
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('blocks_title_ar', 'contract_articles')}</Label>
                            <input
                                type="text"
                                value={block.title_ar ?? ''}
                                disabled={disabled}
                                onChange={(e) => updateBlock(block.id, { title_ar: e.target.value })}
                                dir="rtl"
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                            />
                        </div>
                    </div>

                    {block.type === 'option' && block.options ? (
                        <div className="mt-4 space-y-4 border-t pt-4">
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-medium">{t('blocks_options_title', 'contract_articles')}</p>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={disabled}
                                    onClick={() => addOption(block.id)}
                                >
                                    <Plus className="mr-1 h-4 w-4" />
                                    {t('blocks_add_option', 'contract_articles')}
                                </Button>
                            </div>
                            {block.options.map((opt, oi) => (
                                <div
                                    key={`${block.id}-opt-${opt.key}`}
                                    className="rounded-md border border-border bg-muted/20 p-3 space-y-3"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-mono font-semibold">
                                            {t('blocks_option_key', 'contract_articles', { key: opt.key })}
                                        </span>
                                        {block.options && block.options.length > 2 && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                disabled={disabled}
                                                onClick={() => removeOption(block.id, oi)}
                                            >
                                                {t('blocks_remove_option', 'contract_articles')}
                                            </Button>
                                        )}
                                    </div>
                                    <div className="grid gap-2 sm:grid-cols-2">
                                        <div>
                                            <Label className="text-xs">{t('blocks_option_title_en', 'contract_articles')}</Label>
                                            <input
                                                type="text"
                                                className="mt-1 flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                                                value={opt.title_en ?? ''}
                                                disabled={disabled}
                                                onChange={(e) =>
                                                    updateOption(block.id, oi, { title_en: e.target.value })
                                                }
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs">{t('blocks_option_title_ar', 'contract_articles')}</Label>
                                            <input
                                                type="text"
                                                className="mt-1 flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                                                dir="rtl"
                                                value={opt.title_ar ?? ''}
                                                disabled={disabled}
                                                onChange={(e) =>
                                                    updateOption(block.id, oi, { title_ar: e.target.value })
                                                }
                                            />
                                        </div>
                                    </div>
                                    <BodyField
                                        blockId={`${block.id}-opt-${oi}`}
                                        lang="en"
                                        value={opt.body_en}
                                        onChange={(v) => updateOption(block.id, oi, { body_en: v })}
                                        label={t('blocks_option_body_en', 'contract_articles')}
                                        hint={t('blocks_body_format_hint', 'contract_articles')}
                                        disabled={disabled}
                                    />
                                    <BodyField
                                        blockId={`${block.id}-opt-${oi}`}
                                        lang="ar"
                                        value={opt.body_ar}
                                        onChange={(v) => updateOption(block.id, oi, { body_ar: v })}
                                        label={t('blocks_option_body_ar', 'contract_articles')}
                                        hint={t('blocks_body_format_hint', 'contract_articles')}
                                        disabled={disabled}
                                    />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <>
                            <div className="mt-4 grid gap-4 lg:grid-cols-2">
                                <BodyField
                                    blockId={block.id}
                                    lang="en"
                                    value={block.body_en}
                                    onChange={(v) => updateBlock(block.id, { body_en: v })}
                                    label={t('blocks_body_en', 'contract_articles')}
                                    hint={t('blocks_body_format_hint', 'contract_articles')}
                                    disabled={disabled}
                                />
                                <BodyField
                                    blockId={block.id}
                                    lang="ar"
                                    value={block.body_ar}
                                    onChange={(v) => updateBlock(block.id, { body_ar: v })}
                                    label={t('blocks_body_ar', 'contract_articles')}
                                    hint={t('blocks_body_format_hint', 'contract_articles')}
                                    disabled={disabled}
                                />
                            </div>
                        </>
                    )}

                    <div className="mt-4 space-y-2 border-t pt-4">
                        <p className="text-sm font-medium">{t('blocks_variable_keys', 'contract_articles')}</p>
                        <p className="text-xs text-muted-foreground">{t('blocks_variable_keys_help', 'contract_articles')}</p>
                        <div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto rounded-md border border-border p-2">
                            {variableKeysCatalog.map((vk) => (
                                <label key={vk} className="flex cursor-pointer items-center gap-1.5 text-xs">
                                    <input
                                        type="checkbox"
                                        className="h-3.5 w-3.5 rounded border-input"
                                        checked={(block.variable_keys ?? []).includes(vk)}
                                        disabled={disabled}
                                        onChange={() => toggleVarKey(block.id, vk)}
                                    />
                                    <span className="font-mono">{vk}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="mt-4 space-y-2">
                        <p className="text-sm font-medium">{t('blocks_risk_tags', 'contract_articles')}</p>
                        <div className="flex flex-wrap gap-2 rounded-md border border-border p-2">
                            {allowedRiskTags.map((tag) => (
                                <label key={tag} className="flex cursor-pointer items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-input"
                                        checked={(block.risk_tags ?? []).includes(tag)}
                                        disabled={disabled}
                                        onChange={() => toggleRisk(block.id, tag)}
                                    />
                                    <span>{t(riskTagLabelKey(tag), 'contract_articles')}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
            ))}

            <Button type="button" variant="secondary" disabled={disabled} onClick={addBlock} className="w-full sm:w-auto">
                <Plus className="me-2 h-4 w-4" />
                {t('blocks_add_block', 'contract_articles')}
            </Button>
        </div>
    );
}
