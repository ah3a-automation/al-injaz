import AppLayout from '@/Layouts/AppLayout';
import { Button } from '@/Components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/Components/ui/card';
import { Head, Link, router } from '@inertiajs/react';
import { useLocale } from '@/hooks/useLocale';

interface ContractArticleVersion {
    id: string;
    version_number: number;
    title_ar: string;
    title_en: string;
    content_ar: string;
    content_en: string;
    change_summary?: string | null;
}

interface ContractArticle {
    id: string;
    code: string;
    serial: number;
    category: string;
    status: string;
    internal_notes: string | null;
    current_version?: ContractArticleVersion | null;
    versions: ContractArticleVersion[];
}

interface ShowProps {
    article: ContractArticle;
    can: {
        update: boolean;
    };
}

export default function Show({ article, can }: ShowProps) {
    const currentVersion = article.current_version ?? null;
    const { t } = useLocale();

    return (
        <AppLayout>
            <Head title={`${t('title_show', 'contract_articles')} ${article.code}`} />
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">
                            {t('title_show', 'contract_articles')} {article.code}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {t('category', 'contract_articles')}: {article.category} ·{' '}
                            {t('status', 'contract_articles')}: {article.status} ·{' '}
                            {t('serial', 'contract_articles')}: {article.serial}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" asChild>
                            <Link href={route('contract-articles.index')}>
                                {t('action_back', 'contract_articles')}
                            </Link>
                        </Button>
                        {can.update && (
                            <>
                                <Button asChild>
                                    <Link href={route('contract-articles.edit', article.id)}>
                                        {t('action_edit', 'contract_articles')}
                                    </Link>
                                </Button>
                                {article.status === 'active' && (
                                    <Button
                                        variant="outline"
                                        onClick={() =>
                                            router.post(
                                                route('contract-articles.archive', article.id)
                                            )
                                        }
                                    >
                                        {t('action_archive', 'contract_articles')}
                                    </Button>
                                )}
                                {article.status === 'archived' && (
                                    <Button
                                        variant="outline"
                                        onClick={() =>
                                            router.post(
                                                route('contract-articles.activate', article.id)
                                            )
                                        }
                                    >
                                        {t('action_reactivate', 'contract_articles')}
                                    </Button>
                                )}
                            </>
                        )}
                        {article.versions.length > 1 && (
                            <Button variant="secondary" asChild>
                                <Link href={route('contract-articles.compare', article.id)}>
                                    {t('title_compare', 'contract_articles')}
                                </Link>
                            </Button>
                        )}
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    <Card className="md:col-span-2">
                        <CardHeader>
                            <CardTitle>
                                {t('section_current_content', 'contract_articles')}
                            </CardTitle>
                            <CardDescription>
                                {t('section_current_content_help', 'contract_articles')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {currentVersion ? (
                                <>
                                    <div className="text-sm text-muted-foreground">
                                        {t('current_version', 'contract_articles')}:{' '}
                                        v{currentVersion.version_number}
                                        {currentVersion.change_summary && (
                                            <span> — {currentVersion.change_summary}</span>
                                        )}
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <h2 className="text-sm font-semibold uppercase tracking-wide">
                                                {t('tab_english', 'contract_articles')}
                                            </h2>
                                            <div className="rounded-md border bg-card p-3">
                                                <p className="font-medium mb-2">
                                                    {currentVersion.title_en}
                                                </p>
                                                <p className="whitespace-pre-wrap text-sm">
                                                    {currentVersion.content_en}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <h2 className="text-sm font-semibold uppercase tracking-wide">
                                                {t('tab_arabic', 'contract_articles')}
                                            </h2>
                                            <div className="rounded-md border bg-card p-3" dir="rtl">
                                                <p className="font-medium mb-2">
                                                    {currentVersion.title_ar}
                                                </p>
                                                <p className="whitespace-pre-wrap text-sm">
                                                    {currentVersion.content_ar}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    {t('info_no_versions_for_article', 'contract_articles')}
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>
                                {t('version_history', 'contract_articles')}
                            </CardTitle>
                            <CardDescription>
                                {t('section_version_history_help', 'contract_articles')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {article.versions.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    {t('no_versions', 'contract_articles')}
                                </p>
                            ) : (
                                <ul className="space-y-2 text-sm">
                                    {article.versions.map((version) => (
                                        <li
                                            key={version.id}
                                            className={`flex items-start justify-between gap-2 rounded-md border px-3 py-2 ${
                                                currentVersion &&
                                                version.id === currentVersion.id
                                                    ? 'bg-muted/60'
                                                    : 'bg-card'
                                            }`}
                                        >
                                            <div>
                                                <p className="font-medium">
                                                    v{version.version_number}
                                                    {currentVersion &&
                                                        version.id === currentVersion.id && (
                                                            <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                                                                {t('flag_current', 'contract_articles')}
                                                            </span>
                                                        )}
                                                </p>
                                                {version.change_summary && (
                                                    <p className="text-xs text-muted-foreground">
                                                        {version.change_summary}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                {can.update && currentVersion && (
                                                    <div className="flex gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            asChild
                                                        >
                                                            <Link
                                                                href={route(
                                                                    'contract-articles.compare',
                                                                    {
                                                                        contract_article:
                                                                            article.id,
                                                                        left_version_id:
                                                                            version.id,
                                                                        right_version_id:
                                                                            currentVersion.id,
                                                                    }
                                                                )}
                                                            >
                                                                {t('action_compare', 'contract_articles')}
                                                            </Link>
                                                        </Button>
                                                        {currentVersion.id !== version.id && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() =>
                                                                    router.post(
                                                                        route(
                                                                            'contract-articles.restore',
                                                                            {
                                                                                contract_article:
                                                                                    article.id,
                                                                                version:
                                                                                    version.id,
                                                                            }
                                                                        )
                                                                    )
                                                                }
                                                            >
                                                                {t('action_restore', 'contract_articles')}
                                                            </Button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </CardContent>
                    </Card>

                    {article.internal_notes && (
                        <Card className="md:col-span-3">
                            <CardHeader>
                                <CardTitle>
                                    {t('internal_notes', 'contract_articles')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="whitespace-pre-wrap text-sm">
                                    {article.internal_notes}
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}

