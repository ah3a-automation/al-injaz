import AppLayout from '@/Layouts/AppLayout';
import { Button } from '@/Components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/Components/ui/card';
import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';

interface ContractArticleVersion {
    id: string;
    version_number: number;
    title_ar: string;
    title_en: string;
    content_ar: string;
    content_en: string;
    change_summary?: string | null;
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
    versions: ContractArticleVersion[];
    left: ContractArticleVersion | null;
    right: ContractArticleVersion | null;
}

type LanguageTab = 'en' | 'ar';

export default function Compare({
    article,
    versions,
    left,
    right,
}: CompareProps) {
    const [language, setLanguage] = useState<LanguageTab>('en');

    const latestVersionId = versions[0]?.id ?? null;

    const leftLabel = left
        ? `v${left.version_number}${left.id === latestVersionId ? ' · Current' : ''}`
        : '—';
    const rightLabel = right
        ? `v${right.version_number}${right.id === latestVersionId ? ' · Current' : ''}`
        : '—';

    const currentLeftTitle = language === 'en' ? left?.title_en : left?.title_ar;
    const currentRightTitle = language === 'en' ? right?.title_en : right?.title_ar;
    const currentLeftContent = language === 'en' ? left?.content_en : left?.content_ar;
    const currentRightContent = language === 'en' ? right?.content_en : right?.content_ar;

    return (
        <AppLayout>
            <Head title={`Compare ${article.code}`} />
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">
                            Compare Article Versions
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {article.code} · Category: {article.category} · Status:{' '}
                            {article.status}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" asChild>
                            <Link href={route('contract-articles.show', article.id)}>
                                Back to article
                            </Link>
                        </Button>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Language</CardTitle>
                        <CardDescription>
                            Switch between English and Arabic views for side-by-side comparison.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="inline-flex rounded-md border bg-muted p-1">
                            <button
                                type="button"
                                className={`px-3 py-1 text-sm rounded-md ${
                                    language === 'en'
                                        ? 'bg-background font-semibold shadow'
                                        : 'text-muted-foreground'
                                }`}
                                onClick={() => setLanguage('en')}
                            >
                                English
                            </button>
                            <button
                                type="button"
                                className={`px-3 py-1 text-sm rounded-md ${
                                    language === 'ar'
                                        ? 'bg-background font-semibold shadow'
                                        : 'text-muted-foreground'
                                }`}
                                onClick={() => setLanguage('ar')}
                            >
                                Arabic
                            </button>
                        </div>
                    </CardContent>
                </Card>

                {versions.length < 2 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Compare availability</CardTitle>
                            <CardDescription>
                                Only one version exists for this article. Create a new version by
                                editing the article to enable comparison.
                            </CardDescription>
                        </CardHeader>
                    </Card>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Left version</CardTitle>
                            <CardDescription>{leftLabel}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {left ? (
                                <div className="space-y-4">
                                    {left.change_summary && (
                                        <p className="text-xs text-muted-foreground">
                                            {left.change_summary}
                                        </p>
                                    )}
                                    <div
                                        className={language === 'ar' ? 'space-y-2' : 'space-y-2'}
                                        dir={language === 'ar' ? 'rtl' : 'ltr'}
                                    >
                                        <p className="font-semibold">
                                            {currentLeftTitle ?? '—'}
                                        </p>
                                        <p className="whitespace-pre-wrap text-sm">
                                            {currentLeftContent ?? '—'}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    No left version selected.
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Right version</CardTitle>
                            <CardDescription>{rightLabel}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {right ? (
                                <div className="space-y-4">
                                    {right.change_summary && (
                                        <p className="text-xs text-muted-foreground">
                                            {right.change_summary}
                                        </p>
                                    )}
                                    <div
                                        className={language === 'ar' ? 'space-y-2' : 'space-y-2'}
                                        dir={language === 'ar' ? 'rtl' : 'ltr'}
                                    >
                                        <p className="font-semibold">
                                            {currentRightTitle ?? '—'}
                                        </p>
                                        <p className="whitespace-pre-wrap text-sm">
                                            {currentRightContent ?? '—'}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    No right version selected.
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Version selection</CardTitle>
                        <CardDescription>
                            Choose any two versions to compare. The compare view above will update
                            based on the selection.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {versions.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                No versions available for selection.
                            </p>
                        ) : (
                            <div className="overflow-x-auto rounded-md border">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/80">
                                        <tr className="border-b border-border">
                                            <th className="px-4 py-2 text-left font-medium">
                                                Version
                                            </th>
                                            <th className="px-4 py-2 text-left font-medium">
                                                Change summary
                                            </th>
                                            <th className="px-4 py-2 text-left font-medium">
                                                Flags
                                            </th>
                                            <th className="px-4 py-2 text-right font-medium">
                                                Actions
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
                                                <td className="px-4 py-2 text-xs text-muted-foreground">
                                                    <div className="flex flex-wrap gap-1">
                                                        {version.id === latestVersionId && (
                                                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                                                                Current
                                                            </span>
                                                        )}
                                                        {left && version.id === left.id && (
                                                            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                                                                Left
                                                            </span>
                                                        )}
                                                        {right && version.id === right.id && (
                                                            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-medium text-purple-700">
                                                                Right
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2 text-right">
                                                    <div className="inline-flex gap-2">
                                                        <Button variant="outline" size="sm" asChild>
                                                            <Link
                                                                href={route(
                                                                    'contract-articles.compare',
                                                                    {
                                                                        contract_article:
                                                                            article.id,
                                                                        left_version_id:
                                                                            version.id,
                                                                        right_version_id:
                                                                            right?.id ??
                                                                            versions[0]?.id,
                                                                    }
                                                                )}
                                                            >
                                                                Set as left
                                                            </Link>
                                                        </Button>
                                                        <Button variant="outline" size="sm" asChild>
                                                            <Link
                                                                href={route(
                                                                    'contract-articles.compare',
                                                                    {
                                                                        contract_article:
                                                                            article.id,
                                                                        left_version_id:
                                                                            left?.id ??
                                                                            versions[0]?.id,
                                                                        right_version_id:
                                                                            version.id,
                                                                    }
                                                                )}
                                                            >
                                                                Set as right
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

