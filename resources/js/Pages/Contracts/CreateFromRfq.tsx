import AppLayout from '@/Layouts/AppLayout';
import { formatDateForInput } from '@/lib/utils';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Head, Link, useForm } from '@inertiajs/react';
import { useLocale } from '@/hooks/useLocale';
import type { PageProps } from '@/types';

interface RfqSummary {
    id: string;
    rfq_number: string;
    title: string | null;
    status: string;
    currency: string | null;
}

interface AwardSummary {
    id: string;
    awarded_amount: string;
    currency: string | null;
    award_note: string | null;
    supplier: {
        id: string;
        legal_name_en: string;
        supplier_code: string | null;
    } | null;
}

interface ProjectSummary {
    id: string;
    name: string;
    name_en: string | null;
    code: string | null;
}

interface PackageSummary {
    id: string;
    package_no: string | null;
    name: string;
}

interface TemplateSummary {
    id: string;
    code: string;
    name_en: string;
    name_ar: string;
    template_type: string;
    status: string;
}

interface ArticleSummary {
    id: string;
    code: string;
    serial: number;
    category: string;
    title_en?: string;
    title_ar?: string;
    snippet_en?: string | null;
}

interface Props extends PageProps {
    rfq: RfqSummary;
    award: AwardSummary;
    project: ProjectSummary | null;
    package: PackageSummary | null;
    templates: TemplateSummary[];
    articles: ArticleSummary[];
}

export default function CreateFromRfq({ rfq, award, project, package: pkg, templates, articles }: Props) {
    const { t } = useLocale('contracts');

    const { data, setData, post, processing, errors } = useForm({
        contract_template_id: '',
        article_ids: [] as string[],
        title_en: '',
        title_ar: '',
        description: '',
        internal_notes: '',
        start_date: '',
        end_date: '',
    });

    const toggleArticle = (id: string) => {
        setData(
            'article_ids',
            (data.article_ids as string[]).includes(id)
                ? (data.article_ids as string[]).filter((x) => x !== id)
                : [...(data.article_ids as string[]), id],
        );
    };

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        post(route('contracts.store-from-rfq', rfq.id));
    };

    const selectedArticleIds = data.article_ids as string[];

    return (
        <AppLayout>
            <Head title={t('handover.title', 'contracts', { rfq: rfq.rfq_number })} />
            <div className="space-y-6">
                <nav className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Link href={route('rfqs.show', rfq.id)} className="hover:text-foreground">
                        {t('handover.breadcrumb.rfq', 'contracts', { rfq: rfq.rfq_number })}
                    </Link>
                    <span className="text-muted-foreground">/</span>
                    <span className="font-medium text-foreground">
                        {t('handover.breadcrumb.contract_draft')}
                    </span>
                </nav>

                <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-3">
                    <div className="space-y-4 lg:col-span-1">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm font-semibold">
                                    {t('handover.sections.source_title')}
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    {t('handover.sections.source_description')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                <div>
                                    <p className="text-xs text-muted-foreground">
                                        {t('handover.labels.rfq')}
                                    </p>
                                    <p className="font-medium">
                                        <Link
                                            href={route('rfqs.show', rfq.id)}
                                            className="hover:underline"
                                        >
                                            {rfq.rfq_number}
                                        </Link>
                                    </p>
                                </div>
                                {project && (
                                    <div>
                                        <p className="text-xs text-muted-foreground">
                                            {t('handover.labels.project')}
                                        </p>
                                        <p className="font-medium">{project.name}</p>
                                    </div>
                                )}
                                {pkg && (
                                    <div>
                                        <p className="text-xs text-muted-foreground">
                                            {t('handover.labels.procurement_package')}
                                        </p>
                                        <p className="font-medium">
                                            {pkg.package_no ?? '—'} — {pkg.name}
                                        </p>
                                    </div>
                                )}
                                {award.supplier && (
                                    <div>
                                        <p className="text-xs text-muted-foreground">
                                            {t('handover.labels.supplier')}
                                        </p>
                                        <p className="font-medium">
                                            {award.supplier.legal_name_en}
                                        </p>
                                    </div>
                                )}
                                <div>
                                    <p className="text-xs text-muted-foreground">
                                        {t('handover.labels.awarded_amount')}
                                    </p>
                                    <p className="font-medium tabular-nums">
                                        {award.currency ?? rfq.currency ?? ''}{' '}
                                        {parseFloat(award.awarded_amount).toLocaleString(undefined, {
                                            maximumFractionDigits: 2,
                                        })}
                                    </p>
                                </div>
                                {award.award_note && (
                                    <div>
                                        <p className="text-xs text-muted-foreground">
                                            {t('handover.labels.award_note')}
                                        </p>
                                        <p className="mt-0.5 whitespace-pre-wrap text-xs">
                                            {award.award_note}
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm font-semibold">
                                    {t('handover.sections.metadata_title')}
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    {t('handover.sections.metadata_description')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div>
                                    <Label htmlFor="title_en">
                                        {t('fields.title_en.label')}
                                    </Label>
                                    <Input
                                        id="title_en"
                                        value={data.title_en}
                                        onChange={(e) => setData('title_en', e.target.value)}
                                        className="mt-1"
                                    />
                                    {errors.title_en && (
                                        <p className="mt-1 text-xs text-destructive">
                                            {errors.title_en}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <Label htmlFor="title_ar">
                                        {t('fields.title_ar.label')}
                                    </Label>
                                    <Input
                                        id="title_ar"
                                        value={data.title_ar}
                                        onChange={(e) => setData('title_ar', e.target.value)}
                                        className="mt-1"
                                    />
                                    {errors.title_ar && (
                                        <p className="mt-1 text-xs text-destructive">
                                            {errors.title_ar}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <Label htmlFor="start_date">
                                        {t('fields.start_date.label')}
                                    </Label>
                                    <Input
                                        id="start_date"
                                        type="date"
                                        value={formatDateForInput(data.start_date)}
                                        onChange={(e) => setData('start_date', e.target.value)}
                                        className="mt-1"
                                    />
                                    {errors.start_date && (
                                        <p className="mt-1 text-xs text-destructive">
                                            {errors.start_date}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <Label htmlFor="end_date">
                                        {t('fields.end_date.label')}
                                    </Label>
                                    <Input
                                        id="end_date"
                                        type="date"
                                        value={formatDateForInput(data.end_date)}
                                        onChange={(e) => setData('end_date', e.target.value)}
                                        className="mt-1"
                                    />
                                    {errors.end_date && (
                                        <p className="mt-1 text-xs text-destructive">
                                            {errors.end_date}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <Label htmlFor="description">
                                        {t('fields.description.label')}
                                    </Label>
                                    <textarea
                                        id="description"
                                        className="mt-1 flex min-h-[70px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                                        value={data.description}
                                        onChange={(e) => setData('description', e.target.value)}
                                    />
                                    {errors.description && (
                                        <p className="mt-1 text-xs text-destructive">
                                            {errors.description}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <Label htmlFor="internal_notes">
                                        {t('fields.internal_notes.label')}
                                    </Label>
                                    <textarea
                                        id="internal_notes"
                                        className="mt-1 flex min-h-[70px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                                        value={data.internal_notes}
                                        onChange={(e) => setData('internal_notes', e.target.value)}
                                    />
                                    {errors.internal_notes && (
                                        <p className="mt-1 text-xs text-destructive">
                                            {errors.internal_notes}
                                        </p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-4 lg:col-span-2">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm font-semibold">
                                    {t('handover.sections.template_title')}
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    {t('handover.sections.template_description')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="space-y-2">
                                    <Label htmlFor="contract_template_id">
                                        {t('fields.template.label')}
                                    </Label>
                                    <select
                                        id="contract_template_id"
                                        value={data.contract_template_id}
                                        onChange={(e) => setData('contract_template_id', e.target.value)}
                                        className="mt-1 block w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                                    >
                                        <option value="">
                                            {t('handover.template.none_option')}
                                        </option>
                                        {templates.map((tpl) => (
                                            <option key={tpl.id} value={tpl.id}>
                                                {tpl.code} — {tpl.name_en}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.contract_template_id && (
                                        <p className="mt-1 text-xs text-destructive">
                                            {errors.contract_template_id}
                                        </p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm font-semibold">
                                    {t('handover.sections.articles_title')}
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    {t('handover.sections.articles_description')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="max-h-80 overflow-y-auto rounded-md border divide-y">
                                    {articles.length === 0 && (
                                        <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                                            {t('handover.articles.empty')}
                                        </div>
                                    )}
                                    {articles.map((article) => {
                                        const selected = selectedArticleIds.includes(article.id);
                                        return (
                                            <button
                                                key={article.id}
                                                type="button"
                                                onClick={() => toggleArticle(article.id)}
                                                className={`block w-full px-4 py-3 text-left text-sm ${
                                                    selected ? 'bg-primary/5' : 'hover:bg-muted/50'
                                                }`}
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-mono text-[11px] text-muted-foreground">
                                                                {article.code}
                                                            </span>
                                                            <span className="text-xs text-foreground">
                                                                {article.title_en}
                                                            </span>
                                                        </div>
                                                        <div className="mt-0.5 text-xs text-muted-foreground">
                                                            {article.title_ar}
                                                        </div>
                                                        {article.snippet_en && (
                                                            <div className="mt-1 text-xs text-muted-foreground line-clamp-2">
                                                                {article.snippet_en}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="shrink-0 text-xs text-muted-foreground">
                                                        {selected
                                                            ? t('handover.articles.badge_selected')
                                                            : t('handover.articles.badge_add')}
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                                {errors.article_ids && (
                                    <p className="mt-1 text-xs text-destructive">
                                        {errors.article_ids}
                                    </p>
                                )}
                            </CardContent>
                        </Card>

                        <div className="flex justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                asChild
                            >
                                <Link href={route('rfqs.show', rfq.id)}>
                                    {t('common.cancel')}
                                </Link>
                            </Button>
                            <Button type="submit" disabled={processing}>
                                {t('handover.actions.create_draft')}
                            </Button>
                        </div>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}

