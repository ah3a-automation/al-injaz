import React, { useState } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import type { PageProps } from '@/types';
import { useLocale } from '@/hooks/useLocale';

interface ArticleOption {
    id: string;
    code: string;
    serial: number;
    category: string;
    status: string;
    title_en?: string;
    title_ar?: string;
    snippet_en?: string | null;
    snippet_ar?: string | null;
}

interface CreateProps extends PageProps {
    templateTypes: string[];
    statuses: string[];
    articles: ArticleOption[];
}

export default function Create({ templateTypes, statuses, articles }: CreateProps) {
    const { t } = useLocale('contract_templates');

    const [selectedArticleIds, setSelectedArticleIds] = useState<string[]>([]);

    const { data, setData, post, processing, errors } = useForm({
        code: '',
        name_en: '',
        name_ar: '',
        template_type: templateTypes[0] ?? '',
        status: statuses[0] ?? 'draft',
        description: '',
        internal_notes: '',
        article_ids: [] as string[],
    });

    const toggleArticle = (id: string) => {
        setSelectedArticleIds((current) => {
            if (current.includes(id)) {
                return current.filter((x) => x !== id);
            }

            return [...current, id];
        });
    };

    const moveArticle = (id: string, direction: 'up' | 'down') => {
        setSelectedArticleIds((current) => {
            const index = current.indexOf(id);
            if (index === -1) return current;

            const swapWith = direction === 'up' ? index - 1 : index + 1;
            if (swapWith < 0 || swapWith >= current.length) return current;

            const clone = [...current];
            const temp = clone[index];
            clone[index] = clone[swapWith];
            clone[swapWith] = temp;

            return clone;
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setData('article_ids', selectedArticleIds);

        post(route('contract-templates.store'));
    };

    const selectedArticles = selectedArticleIds
        .map((id) => articles.find((a) => a.id === id))
        .filter((a): a is ArticleOption => Boolean(a));

    return (
        <AppLayout>
            <Head title={t('create.title')} />

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-semibold">{t('create.heading')}</h1>
                        <p className="mt-1 text-sm text-gray-600">{t('create.subtitle')}</p>
                    </div>

                    <div className="flex gap-2">
                        <Link
                            href={route('contract-templates.index')}
                            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                        >
                            {t('common.cancel')}
                        </Link>
                        <button
                            type="submit"
                            disabled={processing}
                            className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                            {t('create.actions.save')}
                        </button>
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-1 space-y-4">
                        <div className="rounded-md bg-white p-4 shadow-sm space-y-3">
                            <h2 className="text-sm font-semibold text-gray-900">{t('create.sections.metadata_title')}</h2>
                            <p className="text-xs text-gray-600">{t('create.sections.metadata_description')}</p>

                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700">
                                        {t('fields.code.label')}
                                    </label>
                                    <input
                                        type="text"
                                        className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary"
                                        value={data.code}
                                        onChange={(e) => setData('code', e.target.value)}
                                    />
                                    {errors.code && (
                                        <p className="mt-1 text-xs text-red-600">{errors.code}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-700">
                                        {t('fields.name_en.label')}
                                    </label>
                                    <input
                                        type="text"
                                        className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary"
                                        value={data.name_en}
                                        onChange={(e) => setData('name_en', e.target.value)}
                                    />
                                    {errors.name_en && (
                                        <p className="mt-1 text-xs text-red-600">{errors.name_en}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-700">
                                        {t('fields.name_ar.label')}
                                    </label>
                                    <input
                                        type="text"
                                        className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary"
                                        value={data.name_ar}
                                        onChange={(e) => setData('name_ar', e.target.value)}
                                    />
                                    {errors.name_ar && (
                                        <p className="mt-1 text-xs text-red-600">{errors.name_ar}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-700">
                                        {t('fields.template_type.label')}
                                    </label>
                                    <select
                                        className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary"
                                        value={data.template_type}
                                        onChange={(e) => setData('template_type', e.target.value)}
                                    >
                                        {templateTypes.map((type) => (
                                            <option key={type} value={type}>
                                                {t(`template_type.${type}`)}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.template_type && (
                                        <p className="mt-1 text-xs text-red-600">{errors.template_type}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-700">
                                        {t('fields.status.label')}
                                    </label>
                                    <select
                                        className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary"
                                        value={data.status}
                                        onChange={(e) => setData('status', e.target.value)}
                                    >
                                        {statuses.map((status) => (
                                            <option key={status} value={status}>
                                                {t(`status.${status}`)}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.status && (
                                        <p className="mt-1 text-xs text-red-600">{errors.status}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-700">
                                        {t('fields.description.label')}
                                    </label>
                                    <textarea
                                        className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary"
                                        rows={3}
                                        value={data.description}
                                        onChange={(e) => setData('description', e.target.value)}
                                    />
                                    {errors.description && (
                                        <p className="mt-1 text-xs text-red-600">{errors.description}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-700">
                                        {t('fields.internal_notes.label')}
                                    </label>
                                    <textarea
                                        className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary"
                                        rows={3}
                                        value={data.internal_notes}
                                        onChange={(e) => setData('internal_notes', e.target.value)}
                                    />
                                    {errors.internal_notes && (
                                        <p className="mt-1 text-xs text-red-600">{errors.internal_notes}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-2 space-y-4">
                        <div className="rounded-md bg-white p-4 shadow-sm space-y-3">
                            <h2 className="text-sm font-semibold text-gray-900">
                                {t('create.sections.article_library_title')}
                            </h2>
                            <p className="text-xs text-gray-600">
                                {t('create.sections.article_library_description')}
                            </p>

                            <div className="max-h-96 overflow-y-auto border border-gray-100 rounded-md divide-y divide-gray-100">
                                {articles.length === 0 && (
                                    <div className="px-4 py-6 text-center text-sm text-gray-500">
                                        {t('create.empty_articles')}
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
                                                selected ? 'bg-primary/5' : 'bg-white hover:bg-gray-50'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono text-xs text-gray-700">
                                                            {article.code}
                                                        </span>
                                                        <span className="text-xs text-gray-500">
                                                            {article.title_en}
                                                        </span>
                                                    </div>
                                                    <div className="mt-0.5 text-xs text-gray-500">
                                                        {article.title_ar}
                                                    </div>
                                                    {article.snippet_en && (
                                                        <div className="mt-1 text-xs text-gray-500 line-clamp-2">
                                                            {article.snippet_en}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="shrink-0 text-xs text-gray-500">
                                                    {selected
                                                        ? t('create.article_selected_badge')
                                                        : t('create.article_select_badge')}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            {errors.article_ids && (
                                <p className="mt-2 text-xs text-red-600">{errors.article_ids}</p>
                            )}
                        </div>

                        <div className="rounded-md bg-white p-4 shadow-sm space-y-3">
                            <h2 className="text-sm font-semibold text-gray-900">
                                {t('create.sections.sequence_title')}
                            </h2>
                            <p className="text-xs text-gray-600">
                                {t('create.sections.sequence_description')}
                            </p>

                            {selectedArticles.length === 0 && (
                                <div className="rounded-md border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-500">
                                    {t('create.sequence_empty')}
                                </div>
                            )}

                            {selectedArticles.length > 0 && (
                                <ol className="space-y-2">
                                    {selectedArticles.map((article, index) => (
                                        <li
                                            key={article.id}
                                            className="flex items-center justify-between gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs"
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-semibold text-gray-700 shadow">
                                                    {index + 1}
                                                </span>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono text-xs text-gray-700">
                                                            {article.code}
                                                        </span>
                                                        <span className="text-xs text-gray-600">
                                                            {article.title_en}
                                                        </span>
                                                    </div>
                                                    <div className="text-[11px] text-gray-500">
                                                        {t('create.sequence_item_hint')}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    className="rounded border border-gray-300 bg-white px-1.5 py-0.5 text-[11px] text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                                                    disabled={index === 0}
                                                    onClick={() => moveArticle(article.id, 'up')}
                                                >
                                                    {t('create.actions.move_up')}
                                                </button>
                                                <button
                                                    type="button"
                                                    className="rounded border border-gray-300 bg-white px-1.5 py-0.5 text-[11px] text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                                                    disabled={index === selectedArticles.length - 1}
                                                    onClick={() => moveArticle(article.id, 'down')}
                                                >
                                                    {t('create.actions.move_down')}
                                                </button>
                                            </div>
                                        </li>
                                    ))}
                                </ol>
                            )}
                        </div>
                    </div>
                </div>
            </form>
        </AppLayout>
    );
}

