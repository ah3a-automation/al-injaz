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

interface EditProps extends PageProps {
    template: {
        id: string;
        code: string;
        name_en: string;
        name_ar: string;
        template_type: string;
        status: string;
        description?: string | null;
        internal_notes?: string | null;
    };
    templateTypes: string[];
    statuses: string[];
    articles: ArticleOption[];
    selectedArticleIds: string[];
}

export default function Edit({ template, templateTypes, statuses, articles, selectedArticleIds }: EditProps) {
    const { t } = useLocale('contract_templates');

    const [articleIds, setArticleIds] = useState<string[]>(selectedArticleIds);

    const { data, setData, put, processing, errors } = useForm({
        code: template.code,
        name_en: template.name_en,
        name_ar: template.name_ar,
        template_type: template.template_type,
        status: template.status,
        description: template.description ?? '',
        internal_notes: template.internal_notes ?? '',
        article_ids: articleIds,
    });

    const toggleArticle = (id: string) => {
        setArticleIds((current) => {
            if (current.includes(id)) {
                return current.filter((x) => x !== id);
            }

            return [...current, id];
        });
    };

    const moveArticle = (id: string, direction: 'up' | 'down') => {
        setArticleIds((current) => {
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
        setData('article_ids', articleIds);

        put(route('contract-templates.update', template.id));
    };

    const orderedArticles = articleIds
        .map((id) => articles.find((a) => a.id === id))
        .filter((a): a is ArticleOption => Boolean(a));

    return (
        <AppLayout>
            <Head title={t('edit.title', 'contract_templates', { code: template.code })} />

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-semibold">{t('edit.heading')}</h1>
                        <p className="mt-1 text-sm text-gray-600">{t('edit.subtitle')}</p>
                    </div>

                    <div className="flex gap-2">
                        <Link
                            href={route('contract-templates.show', template.id)}
                            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                        >
                            {t('common.cancel')}
                        </Link>
                        <button
                            type="submit"
                            disabled={processing}
                            className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                            {t('edit.actions.save')}
                        </button>
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-1 space-y-4">
                        <div className="rounded-md bg-white p-4 shadow-sm space-y-3">
                            <h2 className="text-sm font-semibold text-gray-900">{t('edit.sections.metadata_title')}</h2>
                            <p className="text-xs text-gray-600">{t('edit.sections.metadata_description')}</p>

                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700">
                                        {t('fields.code.label')}
                                    </label>
                                    <input
                                        type="text"
                                        className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm bg-gray-100 text-gray-500"
                                        value={data.code}
                                        readOnly
                                        disabled
                                    />
                                    <p className="mt-1 text-[11px] text-gray-500">
                                        {t('fields.code.readonly_hint')}
                                    </p>
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
                                {t('edit.sections.article_library_title')}
                            </h2>
                            <p className="text-xs text-gray-600">
                                {t('edit.sections.article_library_description')}
                            </p>

                            <div className="max-h-96 overflow-y-auto border border-gray-100 rounded-md divide-y divide-gray-100">
                                {articles.length === 0 && (
                                    <div className="px-4 py-6 text-center text-sm text-gray-500">
                                        {t('edit.empty_articles')}
                                    </div>
                                )}

                                {articles.map((article) => {
                                    const selected = articleIds.includes(article.id);

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
                                                        ? t('edit.article_selected_badge')
                                                        : t('edit.article_select_badge')}
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
                                {t('edit.sections.sequence_title')}
                            </h2>
                            <p className="text-xs text-gray-600">
                                {t('edit.sections.sequence_description')}
                            </p>

                            {orderedArticles.length === 0 && (
                                <div className="rounded-md border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-500">
                                    {t('edit.sequence_empty')}
                                </div>
                            )}

                            {orderedArticles.length > 0 && (
                                <ol className="space-y-2">
                                    {orderedArticles.map((article, index) => (
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
                                                        {t('edit.sequence_item_hint')}
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
                                                    {t('edit.actions.move_up')}
                                                </button>
                                                <button
                                                    type="button"
                                                    className="rounded border border-gray-300 bg-white px-1.5 py-0.5 text-[11px] text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                                                    disabled={index === orderedArticles.length - 1}
                                                    onClick={() => moveArticle(article.id, 'down')}
                                                >
                                                    {t('edit.actions.move_down')}
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

