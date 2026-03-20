import AppLayout from '@/Layouts/AppLayout';
import { Head, Link } from '@inertiajs/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/Components/ui/tabs';
import type { PageProps } from '@/types';
import { useLocale } from '@/hooks/useLocale';

interface VersionRow {
    id: string;
    version_number: number;
    change_summary?: string | null;
    changed_at?: string | null;
    changed_by?: string | null;
}

interface SelectedVersion extends VersionRow {
    title_en: string;
    title_ar: string;
    content_en: string;
    content_ar: string;
}

interface DraftArticleSummary {
    id: string;
    article_code: string;
    origin_type: string;
    title_en: string;
    title_ar: string;
    content_en: string;
    content_ar: string;
}

interface ContractSummary {
    id: string;
    contract_number: string;
}

interface Props extends PageProps {
    contract: ContractSummary;
    draftArticle: DraftArticleSummary;
    versions: VersionRow[];
    selectedVersion: SelectedVersion | null;
}

export default function DraftArticleCompare({
    contract,
    draftArticle,
    versions,
    selectedVersion,
}: Props) {
    const { t } = useLocale('contracts');

    const selectedId = selectedVersion?.id ?? null;

    const formatDateTime = (value?: string | null) =>
        value ? new Date(value).toLocaleString() : '—';

    const labelForOrigin = (origin: string) => {
        if (origin === 'template') return t('versions.origin_template');
        if (origin === 'library') return t('versions.origin_library');
        if (origin === 'manual') return t('versions.origin_manual');
        return origin;
    };

    return (
        <AppLayout>
            <Head
                title={t('versions.compare_title', 'contracts', {
                    contract: contract.contract_number,
                    code: draftArticle.article_code,
                })}
            />
            <div className="space-y-6">
                <nav className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Link href={route('contracts.index')} className="hover:text-foreground">
                        {t('workspace.breadcrumb.contracts')}
                    </Link>
                    <span>/</span>
                    <Link
                        href={route('contracts.show', contract.id)}
                        className="hover:text-foreground"
                    >
                        {contract.contract_number}
                    </Link>
                    <span>/</span>
                    <Link
                        href={route('contracts.edit', contract.id)}
                        className="hover:text-foreground"
                    >
                        {t('workspace.breadcrumb.edit')}
                    </Link>
                    <span>/</span>
                    <span className="font-medium text-foreground">
                        {t('versions.breadcrumb.compare')}
                    </span>
                </nav>

                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-semibold">
                            {t('versions.heading', 'contracts', {
                                code: draftArticle.article_code,
                            })}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {t('versions.subtitle')}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[11px]">
                            {labelForOrigin(draftArticle.origin_type)}
                        </Badge>
                        <Button variant="outline" size="sm" asChild>
                            <Link href={route('contracts.edit', contract.id)}>
                                {t('versions.back_to_workspace')}
                            </Link>
                        </Button>
                    </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-4">
                    <Card className="lg:col-span-1">
                        <CardHeader>
                            <CardTitle className="text-sm font-semibold">
                                {t('versions.history_title')}
                            </CardTitle>
                            <CardDescription className="text-xs">
                                {t('versions.history_description')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {versions.length === 0 && (
                                <p className="text-sm text-muted-foreground">
                                    {t('versions.empty')}
                                </p>
                            )}
                            {versions.map((version) => (
                                <div
                                    key={version.id}
                                    className={`rounded-md border px-3 py-2 text-xs ${
                                        version.id === selectedId
                                            ? 'border-primary bg-primary/5'
                                            : 'border-border bg-background'
                                    }`}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <div>
                                            <p className="font-medium">
                                                {t('versions.version_label', 'contracts', {
                                                    number: version.version_number,
                                                })}
                                            </p>
                                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                                                {formatDateTime(version.changed_at)}
                                            </p>
                                            {version.changed_by && (
                                                <p className="mt-0.5 text-[11px] text-muted-foreground">
                                                    {t('versions.changed_by_label', 'contracts', {
                                                        name: version.changed_by,
                                                    })}
                                                </p>
                                            )}
                                            {version.change_summary && (
                                                <p className="mt-1 text-[11px] text-muted-foreground">
                                                    {version.change_summary}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="mt-2 flex gap-2">
                                        <Button asChild size="sm" variant="outline">
                                            <Link
                                                href={route(
                                                    'contracts.draft-articles.compare',
                                                    {
                                                        contract: contract.id,
                                                        draftArticle: draftArticle.id,
                                                        version_id: version.id,
                                                    },
                                                )}
                                            >
                                                {t('versions.actions.compare')}
                                            </Link>
                                        </Button>
                                        <form
                                            method="post"
                                            action={route(
                                                'contracts.draft-articles.restore-version',
                                                {
                                                    contract: contract.id,
                                                    draftArticle: draftArticle.id,
                                                    version: version.id,
                                                },
                                            )}
                                            className="inline-block"
                                        >
                                            {/* Inertia will spoof method & token */}
                                            <Button type="submit" size="sm" variant="outline">
                                                {t('versions.actions.restore')}
                                            </Button>
                                        </form>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card className="lg:col-span-3">
                        <CardHeader>
                            <CardTitle className="text-sm font-semibold">
                                {t('versions.compare_title_short')}
                            </CardTitle>
                            <CardDescription className="text-xs">
                                {selectedVersion
                                    ? t('versions.compare_description')
                                    : t('versions.empty')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {selectedVersion ? (
                                <Tabs defaultValue="en" className="space-y-4">
                                    <TabsList>
                                        <TabsTrigger value="en">
                                            {t('versions.language.english', 'contracts')}
                                        </TabsTrigger>
                                        <TabsTrigger value="ar">
                                            {t('versions.language.arabic', 'contracts')}
                                        </TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="en" className="space-y-4">
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div className="space-y-2">
                                                <p className="text-xs font-semibold text-muted-foreground">
                                                {t(
                                                    'versions.labels.historical_version',
                                                    'contracts',
                                                    {
                                                        number: selectedVersion.version_number,
                                                    },
                                                )}
                                                </p>
                                                <div className="rounded-md border p-3 text-sm">
                                                    <p className="font-medium mb-2">
                                                        {selectedVersion.title_en}
                                                    </p>
                                                    <p className="whitespace-pre-wrap text-xs text-muted-foreground">
                                                        {selectedVersion.content_en}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <p className="text-xs font-semibold text-muted-foreground">
                                                    {t('versions.labels.current_version', 'contracts')}
                                                </p>
                                                <div className="rounded-md border p-3 text-sm">
                                                    <p className="font-medium mb-2">
                                                        {draftArticle.title_en}
                                                    </p>
                                                    <p className="whitespace-pre-wrap text-xs text-muted-foreground">
                                                        {draftArticle.content_en}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </TabsContent>
                                    <TabsContent value="ar" className="space-y-4">
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div className="space-y-2">
                                                <p className="text-xs font-semibold text-muted-foreground">
                                                    {t(
                                                        'versions.labels.historical_version',
                                                        'contracts',
                                                        {
                                                            number: selectedVersion.version_number,
                                                        },
                                                    )}
                                                </p>
                                                <div className="rounded-md border p-3 text-sm">
                                                    <p className="font-medium mb-2">
                                                        {selectedVersion.title_ar}
                                                    </p>
                                                    <p className="whitespace-pre-wrap text-xs text-muted-foreground">
                                                        {selectedVersion.content_ar}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <p className="text-xs font-semibold text-muted-foreground">
                                                    {t('versions.labels.current_version')}
                                                </p>
                                                <div className="rounded-md border p-3 text-sm">
                                                    <p className="font-medium mb-2">
                                                        {draftArticle.title_ar}
                                                    </p>
                                                    <p className="whitespace-pre-wrap text-xs text-muted-foreground">
                                                        {draftArticle.content_ar}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    {t('versions.empty')}
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}

