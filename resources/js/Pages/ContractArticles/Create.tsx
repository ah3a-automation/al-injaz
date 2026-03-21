import AppLayout from '@/Layouts/AppLayout';
import { Button } from '@/Components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Head, Link, useForm } from '@inertiajs/react';
import { useLocale } from '@/hooks/useLocale';
import type { FormEventHandler } from 'react';

interface CreateProps {
    categories: string[];
    statuses: string[];
    allowedRiskTags: string[];
}

function riskTagLabelKey(tag: string): `risk_tag_${string}` {
    return `risk_tag_${tag}` as `risk_tag_${string}`;
}

export default function Create({ categories, statuses, allowedRiskTags }: CreateProps) {
    const { t } = useLocale();
    const form = useForm({
        code: '',
        serial: '',
        category: categories[0] ?? 'mandatory',
        status: statuses[0] ?? 'draft',
        internal_notes: '',
        title_ar: '',
        title_en: '',
        content_ar: '',
        content_en: '',
        change_summary: '',
        risk_tags: [] as string[],
    });

    const toggleRiskTag = (tag: string) => {
        const set = new Set(form.data.risk_tags);
        if (set.has(tag)) {
            set.delete(tag);
        } else {
            set.add(tag);
        }
        form.setData('risk_tags', Array.from(set));
    };

    const submit: FormEventHandler = (event) => {
        event.preventDefault();
        form.post(route('contract-articles.store'));
    };

    return (
        <AppLayout>
            <Head title={t('title_create', 'contract_articles')} />
            <div className="mx-auto max-w-5xl space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold tracking-tight">
                        {t('title_create', 'contract_articles')}
                    </h1>
                    <Button variant="outline" asChild>
                        <Link href={route('contract-articles.index')}>
                            {t('action_cancel', 'contract_articles')}
                        </Link>
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>
                            {t('section_metadata', 'contract_articles')}
                        </CardTitle>
                        <CardDescription>
                            {t('section_metadata_create_help', 'contract_articles')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={submit} className="space-y-6">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="code">
                                        {t('article_code', 'contract_articles')}
                                    </Label>
                                    <Input
                                        id="code"
                                        value={form.data.code}
                                        onChange={(event) => form.setData('code', event.target.value)}
                                        required
                                        aria-invalid={!!form.errors.code}
                                    />
                                    {form.errors.code && (
                                        <p className="text-sm text-destructive">
                                            {form.errors.code}
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="serial">
                                        {t('serial', 'contract_articles')}
                                    </Label>
                                    <Input
                                        id="serial"
                                        type="number"
                                        value={form.data.serial}
                                        onChange={(event) =>
                                            form.setData('serial', event.target.value)
                                        }
                                        required
                                        aria-invalid={!!form.errors.serial}
                                    />
                                    {form.errors.serial && (
                                        <p className="text-sm text-destructive">
                                            {form.errors.serial}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="category">
                                        {t('category', 'contract_articles')}
                                    </Label>
                                    <select
                                        id="category"
                                        value={form.data.category}
                                        onChange={(event) =>
                                            form.setData('category', event.target.value)
                                        }
                                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                    >
                                        {categories.map((category) => (
                                            <option key={category} value={category}>
                                                {category}
                                            </option>
                                        ))}
                                    </select>
                                    {form.errors.category && (
                                        <p className="text-sm text-destructive">
                                            {form.errors.category}
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="status">
                                        {t('status', 'contract_articles')}
                                    </Label>
                                    <select
                                        id="status"
                                        value={form.data.status}
                                        onChange={(event) =>
                                            form.setData('status', event.target.value)
                                        }
                                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                    >
                                        {statuses.map((status) => (
                                            <option key={status} value={status}>
                                                {status}
                                            </option>
                                        ))}
                                    </select>
                                    {form.errors.status && (
                                        <p className="text-sm text-destructive">
                                            {form.errors.status}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="internal_notes">
                                    {t('internal_notes', 'contract_articles')}
                                </Label>
                                <textarea
                                    id="internal_notes"
                                    value={form.data.internal_notes}
                                    onChange={(event) =>
                                        form.setData('internal_notes', event.target.value)
                                    }
                                    rows={3}
                                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                />
                                {form.errors.internal_notes && (
                                    <p className="text-sm text-destructive">
                                        {form.errors.internal_notes}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <h2 className="text-lg font-semibold">
                                        {t('section_english_content', 'contract_articles')}
                                    </h2>
                                    <p className="text-sm text-muted-foreground">
                                        {t(
                                            'section_english_content_create_help',
                                            'contract_articles'
                                        )}
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="title_en">
                                        {t('title_en', 'contract_articles')}
                                    </Label>
                                    <Input
                                        id="title_en"
                                        value={form.data.title_en}
                                        onChange={(event) =>
                                            form.setData('title_en', event.target.value)
                                        }
                                        required
                                        aria-invalid={!!form.errors.title_en}
                                    />
                                    {form.errors.title_en && (
                                        <p className="text-sm text-destructive">
                                            {form.errors.title_en}
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="content_en">
                                        {t('content_en', 'contract_articles')}
                                    </Label>
                                    <textarea
                                        id="content_en"
                                        value={form.data.content_en}
                                        onChange={(event) =>
                                            form.setData('content_en', event.target.value)
                                        }
                                        rows={6}
                                        className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                        required
                                        aria-invalid={!!form.errors.content_en}
                                    />
                                    {form.errors.content_en && (
                                        <p className="text-sm text-destructive">
                                            {form.errors.content_en}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <h2 className="text-lg font-semibold">
                                        {t('section_arabic_content', 'contract_articles')}
                                    </h2>
                                    <p className="text-sm text-muted-foreground">
                                        {t(
                                            'section_arabic_content_create_help',
                                            'contract_articles'
                                        )}
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="title_ar">
                                        {t('title_ar', 'contract_articles')}
                                    </Label>
                                    <Input
                                        id="title_ar"
                                        dir="rtl"
                                        value={form.data.title_ar}
                                        onChange={(event) =>
                                            form.setData('title_ar', event.target.value)
                                        }
                                        required
                                        aria-invalid={!!form.errors.title_ar}
                                    />
                                    {form.errors.title_ar && (
                                        <p className="text-sm text-destructive">
                                            {form.errors.title_ar}
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="content_ar">
                                        {t('content_ar', 'contract_articles')}
                                    </Label>
                                    <textarea
                                        id="content_ar"
                                        dir="rtl"
                                        value={form.data.content_ar}
                                        onChange={(event) =>
                                            form.setData('content_ar', event.target.value)
                                        }
                                        rows={6}
                                        className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                        required
                                        aria-invalid={!!form.errors.content_ar}
                                    />
                                    {form.errors.content_ar && (
                                        <p className="text-sm text-destructive">
                                            {form.errors.content_ar}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <p className="text-sm font-medium">{t('risk_tags', 'contract_articles')}</p>
                                <p className="text-xs text-muted-foreground">
                                    {t('risk_tags_help', 'contract_articles')}
                                </p>
                                <div
                                    className="flex flex-wrap gap-2 rounded-md border border-border p-3"
                                    role="group"
                                    aria-label={t('risk_tags', 'contract_articles')}
                                >
                                    {allowedRiskTags.map((tag) => {
                                        const checked = form.data.risk_tags.includes(tag);
                                        return (
                                            <label
                                                key={tag}
                                                className="flex cursor-pointer items-center gap-2 text-sm"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={() => toggleRiskTag(tag)}
                                                    className="h-4 w-4 rounded border-input"
                                                    aria-label={t(riskTagLabelKey(tag), 'contract_articles')}
                                                />
                                                <span>{t(riskTagLabelKey(tag), 'contract_articles')}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                                {form.errors.risk_tags && (
                                    <p className="text-sm text-destructive">{form.errors.risk_tags}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="change_summary">
                                    {t('change_summary', 'contract_articles')}
                                </Label>
                                <Input
                                    id="change_summary"
                                    value={form.data.change_summary}
                                    onChange={(event) =>
                                        form.setData('change_summary', event.target.value)
                                    }
                                    aria-invalid={!!form.errors.change_summary}
                                />
                                {form.errors.change_summary && (
                                    <p className="text-sm text-destructive">
                                        {form.errors.change_summary}
                                    </p>
                                )}
                            </div>

                            <div className="flex gap-2 pt-2">
                                <Button type="submit" disabled={form.processing}>
                                    {t('action_create', 'contract_articles')}
                                </Button>
                                <Button type="button" variant="outline" asChild>
                                    <Link href={route('contract-articles.index')}>
                                        {t('action_cancel', 'contract_articles')}
                                    </Link>
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}

