import React from 'react';
import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { useLocale } from '@/hooks/useLocale';

type TemplateStatus = 'draft' | 'active' | 'archived';

interface ContractTemplateListItem {
    id: string;
    code: string;
    name_en: string;
    name_ar: string;
    template_type: string;
    status: TemplateStatus;
    approval_status?: string;
    created_at: string;
    updated_at: string;
}

interface IndexProps {
    templates: {
        data: ContractTemplateListItem[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    filters: {
        q?: string | null;
        template_type?: string | null;
        status?: TemplateStatus | null;
        approval_status?: string | null;
        per_page?: number;
    };
    templateTypes: string[];
    statuses: TemplateStatus[];
    approvalStatuses: string[];
    can: {
        create: boolean;
        manage: boolean;
    };
}

export default function Index({ templates, filters, templateTypes, statuses, approvalStatuses, can }: IndexProps) {
    const { t } = useLocale('contract_templates');
    const { url } = usePage();

    const { data, get, setData } = useForm({
        q: filters.q ?? '',
        template_type: filters.template_type ?? '',
        status: filters.status ?? '',
        approval_status: filters.approval_status ?? '',
        per_page: filters.per_page ?? 25,
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        get(url, { preserveState: true, preserveScroll: true });
    };

    return (
        <AppLayout>
            <Head title={t('index.title')} />

            <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                    <h1 className="text-2xl font-semibold">{t('index.heading')}</h1>

                    {can.create && (
                        <Link
                            href={route('contract-templates.create')}
                            className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary/90"
                        >
                            {t('index.actions.new_template')}
                        </Link>
                    )}
                </div>

                <form onSubmit={submit} className="flex flex-wrap items-end gap-3 rounded-md bg-white p-4 shadow-sm">
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs font-medium text-gray-600">
                            {t('filters.search_label')}
                        </label>
                        <input
                            type="text"
                            className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary"
                            value={data.q}
                            onChange={(e) => setData('q', e.target.value)}
                            placeholder={t('filters.search_placeholder')}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-600">
                            {t('filters.template_type_label')}
                        </label>
                        <select
                            className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary"
                            value={data.template_type}
                            onChange={(e) => setData('template_type', e.target.value)}
                        >
                            <option value="">{t('filters.any_type')}</option>
                            {templateTypes.map((type) => (
                                <option key={type} value={type}>
                                    {t(`template_type.${type}`)}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-600">
                            {t('filters.status_label')}
                        </label>
                        <select
                            className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary"
                            value={data.status ?? ''}
                            onChange={(e) => setData('status', e.target.value as TemplateStatus | '')}
                        >
                            <option value="">{t('filters.any_status')}</option>
                            {statuses.map((status) => (
                                <option key={status} value={status}>
                                    {t(`status.${status}`)}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-600">
                            {t('filters.approval_status_label')}
                        </label>
                        <select
                            className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary"
                            value={data.approval_status ?? ''}
                            onChange={(e) => setData('approval_status', e.target.value)}
                        >
                            <option value="">{t('filters.any_approval')}</option>
                            {approvalStatuses.map((s) => (
                                <option key={s} value={s}>
                                    {t(`approval_status.${s}`)}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-600">
                            {t('filters.per_page_label')}
                        </label>
                        <select
                            className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary"
                            value={data.per_page}
                            onChange={(e) => setData('per_page', Number(e.target.value))}
                        >
                            {[15, 25, 50, 100].map((size) => (
                                <option key={size} value={size}>
                                    {size}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex gap-2">
                        <button
                            type="submit"
                            className="inline-flex items-center rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-800"
                        >
                            {t('filters.apply')}
                        </button>
                    </div>
                </form>

                <div className="overflow-hidden rounded-md bg-white shadow-sm">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-2 text-left font-medium text-gray-700">{t('columns.code')}</th>
                                <th className="px-4 py-2 text-left font-medium text-gray-700">{t('columns.name')}</th>
                                <th className="px-4 py-2 text-left font-medium text-gray-700">
                                    {t('columns.template_type')}
                                </th>
                                <th className="px-4 py-2 text-left font-medium text-gray-700">{t('columns.status')}</th>
                                <th className="px-4 py-2 text-left font-medium text-gray-700">{t('columns.approval')}</th>
                                <th className="px-4 py-2 text-left font-medium text-gray-700">
                                    {t('columns.updated_at')}
                                </th>
                                <th className="px-4 py-2 text-right font-medium text-gray-700">
                                    {t('columns.actions')}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {templates.data.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-4 py-6 text-center text-sm text-gray-500">
                                        {t('index.empty')}
                                    </td>
                                </tr>
                            )}

                            {templates.data.map((template) => (
                                <tr key={template.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-2 font-mono text-xs text-gray-900">{template.code}</td>
                                    <td className="px-4 py-2 text-gray-900">
                                        <div className="font-medium">{template.name_en}</div>
                                        <div className="text-xs text-gray-500">{template.name_ar}</div>
                                    </td>
                                    <td className="px-4 py-2 text-gray-900">
                                        {t(`template_type.${template.template_type}`)}
                                    </td>
                                    <td className="px-4 py-2">
                                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                                            {t(`status.${template.status}`)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2 text-gray-600 text-xs">
                                        {t(`approval_status.${template.approval_status ?? 'none'}`)}
                                    </td>
                                    <td className="px-4 py-2 text-gray-500 text-xs">{template.updated_at}</td>
                                    <td className="px-4 py-2 text-right">
                                        <div className="inline-flex items-center gap-1">
                                            <Link
                                                href={route('contract-templates.show', template.id)}
                                                className="text-xs font-medium text-primary hover:underline"
                                            >
                                                {t('index.actions.view')}
                                            </Link>
                                            {can.manage && (
                                                <Link
                                                    href={route('contract-templates.edit', template.id)}
                                                    className="text-xs font-medium text-gray-700 hover:underline"
                                                >
                                                    {t('index.actions.edit')}
                                                </Link>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </AppLayout>
    );
}

