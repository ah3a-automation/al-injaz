import AppLayout from '@/Layouts/AppLayout';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/Components/ui/card';
import { Head, Link } from '@inertiajs/react';
import { useLocale } from '@/hooks/useLocale';
import { useState } from 'react';

interface ArticleBlockRow {
    id: string;
    type: string;
    sort_order: number;
    title_en?: string;
    title_ar?: string;
    body_en: string;
    body_ar: string;
    is_internal?: boolean;
    options?: Array<{
        key: string;
        body_en: string;
        body_ar: string;
    }> | null;
}

interface VersionRow {
    id: string;
    version_number: number;
    title_ar: string;
    title_en: string;
    content_ar: string;
    content_en: string;
    change_summary?: string | null;
    blocks: ArticleBlockRow[];
    block_count: number;
    block_types: string[];
}

interface ArticleSummary {
    id: string;
    code: string;
    serial: number;
    category: string;
    status: string;
}

interface CompareProps {
    article: ArticleSummary;
    versions: VersionRow[];
    left: VersionRow | null;
    right: VersionRow | null;
}

type LanguageTab = 'en' | 'ar';

function blockSnippet(block: ArticleBlockRow, lang: LanguageTab): string {
    if (block.type === 'option' && block.options && block.options.length > 0) {
        const o = block.options[0];
        return lang === 'en' ? o.body_en : o.body_ar;
    }
    return lang === 'en' ? block.body_en : block.body_ar;
}

export default function Compare({
    article,
    versions,
    left,
    right,
}: CompareProps) {
    const { t } = useLocale();
    const [language, setLanguage] = useState<LanguageTab>('en');

    const latestVersionId = versions[0]?.id ?? null;

    const leftLabel = left
        ? `v${left.version_number}${left.id === latestVersionId ? ` · ${t('flag_current', 'contract_articles')}` : ''}`
        : '—';
    const rightLabel = right
        ? `v${right.version_number}${right.id === latestVersionId ? ` · ${t('flag_current', 'contract_articles')}` : ''}`
        : '—';

    const leftBlocks = left?.blocks ?? [];
    const rightBlocks = right?.blocks ?? [];
    const maxIdx = Math.max(leftBlocks.length, rightBlocks.length, 0);

    return (
        <AppLayout>
            <Head title={`${t('title_compare', 'contract_articles')} ${article.code}`} />
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">
                            {t('title_compare', 'contract_articles')}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {article.code} · {t('category', 'contract_articles')}: {article.category} ·{' '}
                            {t('status', 'contract_articles')}: {article.status}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" asChild>
                            <Link href={route('contract-articles.show', article.id)}>
                                {t('action_back', 'contract_articles')}
                            </Link>
                        </Button>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('section_language', 'contract_articles')}</CardTitle>
                        <CardDescription>{t('section_language_help', 'contract_articles')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="inline-flex rounded-md border bg-muted p-1">
                            <button
                                type="button"
                                className={`rounded-md px-3 py-1 text-sm ${
                                    language === 'en'
                                        ? 'bg-background font-semibold shadow'
                                        : 'text-muted-foreground'
                                }`}
                                onClick={() => setLanguage('en')}
                            >
                                {t('compare_lang_en', 'contract_articles')}
                            </button>
                            <button
                                type="button"
                                className={`rounded-md px-3 py-1 text-sm ${
                                    language === 'ar'
                                        ? 'bg-background font-semibold shadow'
                                        : 'text-muted-foreground'
                                }`}
                                onClick={() => setLanguage('ar')}
                            >
                                {t('compare_lang_ar', 'contract_articles')}
                            </button>
                        </div>
                    </CardContent>
                </Card>

                {versions.length < 2 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('section_compare_state', 'contract_articles')}</CardTitle>
                            <CardDescription>{t('info_compare_single_version', 'contract_articles')}</CardDescription>
                        </CardHeader>
                    </Card>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('label_left_version', 'contract_articles')}</CardTitle>
                            <CardDescription>{leftLabel}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {left ? (
                                <div className="space-y-4">
                                    {left.change_summary && (
                                        <p className="text-xs text-muted-foreground">{left.change_summary}</p>
                                    )}
                                    <div className="flex flex-wrap gap-2 text-xs">
                                        <span className="text-muted-foreground">
                                            {t('compare_block_count', 'contract_articles', {
                                                count: left.block_count,
                                            })}
                                        </span>
                                        {left.block_types.map((bt) => (
                                            <Badge key={bt} variant="outline" className="text-[10px]">
                                                {t(`block_type_${bt}`, 'contract_articles')}
                                            </Badge>
                                        ))}
                                    </div>
                                    <div className="space-y-2">
                                        <p className="font-semibold">
                                            {language === 'en' ? left.title_en : left.title_ar}
                                        </p>
                                        <div className="space-y-3 border-t pt-3">
                                            {Array.from({ length: maxIdx }).map((_, i) => {
                                                const lb = leftBlocks[i];
                                                return (
                                                    <div
                                                        key={lb?.id ?? `l-${i}`}
                                                        className="rounded border border-border p-2 text-sm"
                                                    >
                                                        {lb ? (
                                                            <>
                                                                <div className="mb-1 flex flex-wrap gap-1">
                                                                    <Badge
                                                                        variant="secondary"
                                                                        className="text-[10px]"
                                                                    >
                                                                        {t(`block_type_${lb.type}`, 'contract_articles')}
                                                                    </Badge>
                                                                    {lb.is_internal && (
                                                                        <Badge variant="outline" className="text-[10px]">
                                                                            {t('blocks_internal_badge', 'contract_articles')}
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                                <p className="whitespace-pre-wrap text-xs">
                                                                    {blockSnippet(lb, language)}
                                                                </p>
                                                            </>
                                                        ) : (
                                                            <p className="text-xs text-muted-foreground">—</p>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    {t('info_no_left_selected', 'contract_articles')}
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>{t('label_right_version', 'contract_articles')}</CardTitle>
                            <CardDescription>{rightLabel}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {right ? (
                                <div className="space-y-4">
                                    {right.change_summary && (
                                        <p className="text-xs text-muted-foreground">{right.change_summary}</p>
                                    )}
                                    <div className="flex flex-wrap gap-2 text-xs">
                                        <span className="text-muted-foreground">
                                            {t('compare_block_count', 'contract_articles', {
                                                count: right.block_count,
                                            })}
                                        </span>
                                        {right.block_types.map((bt) => (
                                            <Badge key={bt} variant="outline" className="text-[10px]">
                                                {t(`block_type_${bt}`, 'contract_articles')}
                                            </Badge>
                                        ))}
                                    </div>
                                    <div className="space-y-2">
                                        <p className="font-semibold">
                                            {language === 'en' ? right.title_en : right.title_ar}
                                        </p>
                                        <div className="space-y-3 border-t pt-3">
                                            {Array.from({ length: maxIdx }).map((_, i) => {
                                                const rb = rightBlocks[i];
                                                return (
                                                    <div
                                                        key={rb?.id ?? `r-${i}`}
                                                        className="rounded border border-border p-2 text-sm"
                                                    >
                                                        {rb ? (
                                                            <>
                                                                <div className="mb-1 flex flex-wrap gap-1">
                                                                    <Badge
                                                                        variant="secondary"
                                                                        className="text-[10px]"
                                                                    >
                                                                        {t(`block_type_${rb.type}`, 'contract_articles')}
                                                                    </Badge>
                                                                    {rb.is_internal && (
                                                                        <Badge variant="outline" className="text-[10px]">
                                                                            {t('blocks_internal_badge', 'contract_articles')}
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                                <p className="whitespace-pre-wrap text-xs">
                                                                    {blockSnippet(rb, language)}
                                                                </p>
                                                            </>
                                                        ) : (
                                                            <p className="text-xs text-muted-foreground">—</p>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    {t('info_no_right_selected', 'contract_articles')}
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('section_version_selection', 'contract_articles')}</CardTitle>
                        <CardDescription>{t('section_version_selection_help', 'contract_articles')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {versions.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                {t('info_no_versions_selection', 'contract_articles')}
                            </p>
                        ) : (
                            <div className="overflow-x-auto rounded-md border">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/80">
                                        <tr className="border-b border-border">
                                            <th className="px-4 py-2 text-start font-medium">
                                                {t('version_number', 'contract_articles')}
                                            </th>
                                            <th className="px-4 py-2 text-start font-medium">
                                                {t('change_summary', 'contract_articles')}
                                            </th>
                                            <th className="px-4 py-2 text-start font-medium">
                                                {t('compare_col_blocks', 'contract_articles')}
                                            </th>
                                            <th className="px-4 py-2 text-start font-medium">
                                                {t('col_flags', 'contract_articles')}
                                            </th>
                                            <th className="px-4 py-2 text-end font-medium">
                                                {t('col_actions', 'contract_articles')}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {versions.map((version) => (
                                            <tr
                                                key={version.id}
                                                className={`border-b border-border hover:bg-muted/30 ${
                                                    (left && version.id === left.id) ||
                                                    (right && version.id === right.id)
                                                        ? 'bg-muted/40'
                                                        : ''
                                                }`}
                                            >
                                                <td className="px-4 py-2 font-mono">
                                                    v{version.version_number}
                                                </td>
                                                <td className="px-4 py-2 text-xs text-muted-foreground">
                                                    {version.change_summary ?? '—'}
                                                </td>
                                                <td className="px-4 py-2 text-xs">
                                                    {t('compare_block_count', 'contract_articles', {
                                                        count: version.block_count,
                                                    })}
                                                </td>
                                                <td className="px-4 py-2 text-xs text-muted-foreground">
                                                    <div className="flex flex-wrap gap-1">
                                                        {version.id === latestVersionId && (
                                                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                                                                {t('flag_current', 'contract_articles')}
                                                            </span>
                                                        )}
                                                        {left && version.id === left.id && (
                                                            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                                                                {t('flag_left', 'contract_articles')}
                                                            </span>
                                                        )}
                                                        {right && version.id === right.id && (
                                                            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-medium text-purple-700">
                                                                {t('flag_right', 'contract_articles')}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2 text-end">
                                                    <div className="inline-flex gap-2">
                                                        <Button variant="outline" size="sm" asChild>
                                                            <Link
                                                                href={route('contract-articles.compare', {
                                                                    contract_article: article.id,
                                                                    left_version_id: version.id,
                                                                    right_version_id:
                                                                        right?.id ?? versions[0]?.id,
                                                                })}
                                                            >
                                                                {t('compare_set_left', 'contract_articles')}
                                                            </Link>
                                                        </Button>
                                                        <Button variant="outline" size="sm" asChild>
                                                            <Link
                                                                href={route('contract-articles.compare', {
                                                                    contract_article: article.id,
                                                                    left_version_id:
                                                                        left?.id ?? versions[0]?.id,
                                                                    right_version_id: version.id,
                                                                })}
                                                            >
                                                                {t('compare_set_right', 'contract_articles')}
                                                            </Link>
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
