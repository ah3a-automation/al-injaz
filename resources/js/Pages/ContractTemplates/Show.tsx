import React, { useState } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import Modal from '@/Components/Modal';
import { Button } from '@/Components/ui/button';
import { Label } from '@/Components/ui/label';
import { Textarea } from '@/Components/ui/Textarea';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useLocale } from '@/hooks/useLocale';

interface TemplatePreviewItem {
    id: string;
    sort_order: number;
    article_id?: string;
    article_code?: string;
    title_en?: string;
    title_ar?: string;
    snippet_en?: string | null;
    snippet_ar?: string | null;
}

interface TemplateVersionRow {
    id: string;
    version_number: number;
    name_en: string;
    created_at?: string | null;
    created_by?: { id: number; name: string } | null;
}

interface ShowProps {
    template: {
        id: string;
        code: string;
        name_en: string;
        name_ar: string;
        template_type: string;
        status: 'draft' | 'active' | 'archived';
        approval_status?: string;
        description?: string | null;
        internal_notes?: string | null;
        rejection_reason?: string | null;
        submitted_at?: string | null;
        contracts_manager_approved_at?: string | null;
        legal_approved_at?: string | null;
        created_by?: { id: number; name: string } | null;
        updated_by?: { id: number; name: string } | null;
        submitted_by?: { id: number; name: string } | null;
        contracts_manager_approved_by?: { id: number; name: string } | null;
        legal_approved_by?: { id: number; name: string } | null;
        current_template_version_id?: string | null;
    };
    template_versions: TemplateVersionRow[];
    items: TemplatePreviewItem[];
    can: {
        update: boolean;
        submit_for_approval?: boolean;
        approve_contracts?: boolean;
        approve_legal?: boolean;
        reject?: boolean;
        restore_template_version?: boolean;
    };
}

export default function Show({ template, template_versions, items, can }: ShowProps) {
    const { t, dir } = useLocale('contract_templates');
    const { post, processing } = useForm({});
    const [rejectOpen, setRejectOpen] = useState(false);
    const rejectForm = useForm({ rejection_reason: '' });

    const submitReject = (e: React.FormEvent) => {
        e.preventDefault();
        rejectForm.post(route('contract-templates.reject', template.id), {
            preserveScroll: true,
            onSuccess: () => {
                setRejectOpen(false);
                rejectForm.reset();
            },
        });
    };

    const handleArchive = () => {
        post(route('contract-templates.archive', template.id));
    };

    const handleActivate = () => {
        post(route('contract-templates.activate', template.id));
    };

    return (
        <AppLayout>
            <Head title={t('show.title', 'contract_templates', { code: template.code })} />

            <div className="space-y-6">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <p className="mb-1 text-xs text-gray-500">
                            {t('show.breadcrumbs.contract_templates')}
                        </p>
                        <h1 className="text-2xl font-semibold">
                            {template.name_en}
                        </h1>
                        <p className="mt-1 text-sm text-gray-600">{template.name_ar}</p>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2">
                        <Link
                            href={route('contract-templates.index')}
                            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                        >
                            {t('common.back_to_index')}
                        </Link>

                        {can.submit_for_approval && (
                            <button
                                type="button"
                                onClick={() => router.post(route('contract-templates.submit-for-approval', template.id))}
                                className="inline-flex items-center rounded-md border border-primary bg-primary/10 px-3 py-2 text-xs font-medium text-primary"
                            >
                                {t('governance.submit')}
                            </button>
                        )}
                        {can.approve_contracts && (
                            <button
                                type="button"
                                onClick={() => router.post(route('contract-templates.approve-contracts', template.id))}
                                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-800"
                            >
                                {t('governance.approve_contracts')}
                            </button>
                        )}
                        {can.approve_legal && (
                            <button
                                type="button"
                                onClick={() => router.post(route('contract-templates.approve-legal', template.id))}
                                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-800"
                            >
                                {t('governance.approve_legal')}
                            </button>
                        )}
                        {can.reject && (
                            <button
                                type="button"
                                onClick={() => setRejectOpen(true)}
                                className="inline-flex items-center rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-800"
                            >
                                {t('governance.reject')}
                            </button>
                        )}

                        {can.update && (
                            <>
                                <Link
                                    href={route('contract-templates.edit', template.id)}
                                    className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                                >
                                    {t('show.actions.edit')}
                                </Link>

                                {template.status !== 'archived' && (
                                    <button
                                        type="button"
                                        disabled={processing}
                                        onClick={handleArchive}
                                        className="inline-flex items-center rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 shadow-sm hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-70"
                                    >
                                        {t('show.actions.archive')}
                                    </button>
                                )}

                                {template.status === 'archived' && (
                                    <button
                                        type="button"
                                        disabled={processing}
                                        onClick={handleActivate}
                                        className="inline-flex items-center rounded-md border border-green-200 bg-green-50 px-3 py-2 text-xs font-medium text-green-700 shadow-sm hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-70"
                                    >
                                        {t('show.actions.reactivate')}
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>

                <Modal show={rejectOpen} onClose={() => setRejectOpen(false)} maxWidth="md">
                    <form onSubmit={submitReject} className="p-6 space-y-4">
                        <h2 className="text-lg font-semibold">{t('governance.reject')}</h2>
                        <div className="space-y-2">
                            <Label htmlFor="tpl_rejection_reason">{t('governance.reject_reason')}</Label>
                            <Textarea
                                id="tpl_rejection_reason"
                                value={rejectForm.data.rejection_reason}
                                onChange={(e) => rejectForm.setData('rejection_reason', e.target.value)}
                                required
                                rows={4}
                            />
                            {rejectForm.errors.rejection_reason && (
                                <p className="text-sm text-red-600">{rejectForm.errors.rejection_reason}</p>
                            )}
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setRejectOpen(false)}>
                                {t('common.cancel')}
                            </Button>
                            <Button type="submit" disabled={rejectForm.processing}>
                                {t('governance.reject')}
                            </Button>
                        </div>
                    </form>
                </Modal>

                <div className="grid gap-6 lg:grid-cols-3">
                    <div className="space-y-4 lg:col-span-1">
                        <div className="space-y-3 rounded-md bg-white p-4 shadow-sm">
                            <h2 className="text-sm font-semibold text-gray-900">
                                {t('show.sections.metadata_title')}
                            </h2>

                            <dl className="space-y-2 text-sm text-gray-700">
                                <div className="flex justify-between gap-2">
                                    <dt className="text-gray-500">{t('fields.code.label')}</dt>
                                    <dd className="font-mono text-xs">{template.code}</dd>
                                </div>
                                <div className="flex justify-between gap-2">
                                    <dt className="text-gray-500">{t('fields.template_type.label')}</dt>
                                    <dd>{t(`template_type.${template.template_type}`)}</dd>
                                </div>
                                <div className="flex justify-between gap-2">
                                    <dt className="text-gray-500">{t('fields.status.label')}</dt>
                                    <dd>
                                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                                            {t(`status.${template.status}`)}
                                        </span>
                                    </dd>
                                </div>
                                <div className="flex justify-between gap-2">
                                    <dt className="text-gray-500">Approval</dt>
                                    <dd className="text-xs text-gray-800">
                                        {t(`approval_status.${template.approval_status ?? 'none'}`)}
                                    </dd>
                                </div>
                            </dl>
                            {template.rejection_reason && (
                                <p className="text-xs text-red-700 mt-2">{template.rejection_reason}</p>
                            )}
                        </div>

                        {(template.description || template.internal_notes) && (
                            <div className="space-y-3 rounded-md bg-white p-4 shadow-sm">
                                {template.description && (
                                    <div>
                                        <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wide">
                                            {t('fields.description.label')}
                                        </h3>
                                        <p className="mt-1 whitespace-pre-wrap text-xs text-gray-700">
                                            {template.description}
                                        </p>
                                    </div>
                                )}

                                {template.internal_notes && (
                                    <div>
                                        <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wide">
                                            {t('fields.internal_notes.label')}
                                        </h3>
                                        <p className="mt-1 whitespace-pre-wrap text-xs text-gray-700">
                                            {template.internal_notes}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="space-y-4 lg:col-span-2">
                        {template_versions.length > 0 && (
                            <div className="space-y-3 rounded-md bg-white p-4 shadow-sm">
                                <h2 className="text-sm font-semibold text-gray-900">{t('governance.version_history')}</h2>
                                <ul className="space-y-2 text-xs text-gray-700">
                                    {template_versions.map((v) => (
                                        <li
                                            key={v.id}
                                            className="flex flex-wrap items-center justify-between gap-2 border border-gray-100 rounded px-2 py-1"
                                        >
                                            <span>
                                                v{v.version_number} — {v.name_en}
                                                {v.created_at && (
                                                    <span className="text-gray-500 ms-1">
                                                        ({new Date(v.created_at).toLocaleString()})
                                                    </span>
                                                )}
                                            </span>
                                            {can.restore_template_version && (
                                                <button
                                                    type="button"
                                                    className="text-primary hover:underline"
                                                    onClick={() =>
                                                        router.post(
                                                            route('contract-templates.template-versions.restore', {
                                                                contract_template: template.id,
                                                                contract_template_version: v.id,
                                                            })
                                                        )
                                                    }
                                                >
                                                    {t('governance.restore')}
                                                </button>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div className="space-y-3 rounded-md bg-white p-4 shadow-sm">
                            <div className="flex items-center justify-between gap-2">
                                <div>
                                    <h2 className="text-sm font-semibold text-gray-900">
                                        {t('show.sections.structure_title')}
                                    </h2>
                                    <p className="mt-1 text-xs text-gray-600">
                                        {t('show.sections.structure_description')}
                                    </p>
                                </div>
                            </div>

                            {items.length === 0 && (
                                <div className="rounded-md border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-500">
                                    {t('show.structure_empty')}
                                </div>
                            )}

                            {items.length > 0 && (
                                <ol className="space-y-2">
                                    {items.map((item) => (
                                        <li
                                            key={item.id}
                                            className="flex flex-col gap-1 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs"
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-semibold text-gray-700 shadow">
                                                        {item.sort_order}
                                                    </span>
                                                    <span className="font-mono text-[11px] text-gray-700">
                                                        {item.article_code}
                                                    </span>
                                                    <span className="text-[11px] text-gray-700">
                                                        {item.title_en}
                                                    </span>
                                                </div>
                                            </div>
                                            <div
                                                className={`flex gap-4 text-[11px] text-gray-600 ${
                                                    dir === 'rtl' ? 'flex-row-reverse' : ''
                                                }`}
                                            >
                                                {item.title_ar && (
                                                    <div className="flex-1">
                                                        <div className="font-semibold text-gray-700">
                                                            {t('show.language_labels.arabic')}
                                                        </div>
                                                        <div className="mt-0.5 text-gray-700">{item.title_ar}</div>
                                                    </div>
                                                )}
                                                {item.snippet_en && (
                                                    <div className="flex-1">
                                                        <div className="font-semibold text-gray-700">
                                                            {t('show.language_labels.english_snippet')}
                                                        </div>
                                                        <div className="mt-0.5 whitespace-pre-wrap text-gray-600">
                                                            {item.snippet_en}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                </ol>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

