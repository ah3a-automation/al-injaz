import AppLayout from '@/Layouts/AppLayout';
import { formatDateForInput } from '@/lib/utils';
import Modal from '@/Components/Modal';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/Components/ui/select';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { AlertTriangle, CheckCircle2, ChevronRight, Clock, Sparkles, XCircle } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SharedPageProps } from '@/types';
import { ActivityTimeline, type TimelineEvent } from '@/Components/ActivityTimeline';
import { useLocale } from '@/hooks/useLocale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/Components/ui/tabs';

interface ContractActivityRow {
    id: string;
    activity_type: string;
    description: string;
    created_at: string;
    metadata?: Record<string, unknown> | null;
}

interface ContractVariationRow {
    id: string;
    variation_no: string;
    title: string;
    variation_type: string;
    status: string;
    reason?: string | null;
    description?: string | null;
    commercial_delta: string | null;
    currency: string | null;
    time_delta_days: number;
    submitted_at: string | null;
    submitted_by: { id: number; name: string } | null;
    approved_at: string | null;
    approved_by: { id: number; name: string } | null;
    rejected_at: string | null;
    rejected_by: { id: number; name: string } | null;
    decision_notes: string | null;
}

interface ContractInvoiceRow {
    id: string;
    invoice_no: string;
    title: string;
    invoice_type: string;
    status: string;
    description: string | null;
    amount: string | null;
    currency: string | null;
    period_from: string | null;
    period_to: string | null;
    submitted_at: string | null;
    submitted_by: { id: number; name: string } | null;
    approved_at: string | null;
    approved_by: { id: number; name: string } | null;
    rejected_at: string | null;
    rejected_by: { id: number; name: string } | null;
    paid_at: string | null;
    paid_by: { id: number; name: string } | null;
    decision_notes: string | null;
}

interface ContractDraftArticleRow {
    id: string;
    article_code: string;
    title_en: string;
    title_ar: string;
    content_en: string;
    content_ar: string;
    origin_type: string;
    source_contract_article_id?: string | null;
    is_modified: boolean;
    last_edited_at: string | null;
    updated_by: { id: number; name: string } | null;
    library_baseline: {
        title_en: string;
        title_ar: string;
        content_en: string;
        content_ar: string;
    } | null;
}

interface ContractReviewHistoryItem {
    id: string;
    stage: string;
    decision: string;
    from_status: string;
    to_status: string;
    notes?: string | null;
    decided_by?: string | null;
    decided_at?: string | null;
}

interface ContractReviewSummary {
    status: string;
    current_stage: string | null;
    submitted_for_review_at: string | null;
    submitted_for_review_by: { id: number; name: string } | null;
    review_completed_at: string | null;
    review_completed_by: { id: number; name: string } | null;
    return_reason: string | null;
    approval_summary: string | null;
    history: ContractReviewHistoryItem[];
}

interface ContractDetail {
    id: string;
    contract_number: string;
    contract_value: string;
    currency: string;
    status: string;
    signed_at: string | null;
    created_at: string;
    title_en?: string | null;
    title_ar?: string | null;
    source_type?: string;
    contract_template_id?: string | null;
    rfq?: {
        id: string;
        rfq_number: string;
        title: string;
        status: string;
        project?: { id: string; name: string; name_en: string | null; code: string | null } | null;
        procurement_package?: { id: string; package_no: string | null; name: string } | null;
    } | null;
    supplier?: {
        id: string;
        legal_name_en: string;
        supplier_code: string | null;
        email: string | null;
        phone: string | null;
    } | null;
    created_by?: { id: number; name: string } | null;
    activities: ContractActivityRow[];
    variations: ContractVariationRow[];
    invoices: ContractInvoiceRow[];
    draftArticles?: ContractDraftArticleRow[];
}

interface AiSuggestedArticleRow {
    article_id: string;
    confidence: string;
    reason: string;
    is_mandatory: boolean;
    article_code?: string | null;
    title_en?: string | null;
}

interface AiSuggestedBlockRow {
    article_id: string;
    block_id: string;
    confidence: string;
    reason: string;
    is_mandatory: boolean;
    article_code?: string | null;
    block_type?: string | null;
    block_title_en?: string | null;
}

interface AiOptionRecommendationRow {
    article_id: string;
    block_id: string;
    confidence: string;
    reason: string;
    recommended_option_key: string | null;
    article_code?: string | null;
    block_title_en?: string | null;
}

interface AiSuggestResponse {
    suggested_articles: AiSuggestedArticleRow[];
    suggested_blocks?: AiSuggestedBlockRow[];
    missing_block_categories?: string[];
    option_recommendations?: AiOptionRecommendationRow[];
    suggested_template_id: string | null;
    suggested_template_reason: string | null;
    suggested_template_code?: string | null;
    suggested_template_name_en?: string | null;
    missing_variables: { key: string; label: string; source: string }[];
    risk_flags: string[];
    error: string | null;
}

interface ContractCompletenessPayload {
    variables_filled: number;
    variables_total: number;
    variables_percent: number;
    mandatory_tags_required: string[];
    mandatory_tags_covered: string[];
    mandatory_tags_missing: string[];
    negotiated_articles_count: number;
    unresolved_negotiation_notes_count: number;
    is_ready_for_approval: boolean;
    blocking_reasons: string[];
    overall_status: 'ready' | 'needs_attention' | 'blocked';
    coverage_limitation_note: string | null;
}

interface ContractSignaturePackageSummary {
    status: string;
    is_locked_for_signature: boolean;
    finalized_for_signature_at: string | null;
    finalized_for_signature_by: { id: number; name: string } | null;
    current_issue_package: {
        id: string;
        issue_version: number;
        package_status: string;
        prepared_at: string | null;
        prepared_by: { id: number; name: string } | null;
        snapshot_article_count: number;
    } | null;
    issue_history: {
        id: string;
        issue_version: number;
        package_status: string;
        prepared_at: string | null;
        prepared_by: { id: number; name: string } | null;
        notes?: string | null;
        snapshot_article_count: number;
    }[];
    readiness: {
        is_ready: boolean;
        issues: string[];
    };
}

function IssueSignaturePackageForm({ contractId }: { contractId: string }) {
    const { t } = useLocale('contracts');
    const form = useForm<{ notes: string }>({
        notes: '',
    });

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        form.post(route('contracts.issue-signature-package', contractId), {
            preserveScroll: true,
        });
    };

    return (
        <form onSubmit={handleSubmit} className="mt-2 flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[220px]">
                <Label htmlFor="signature_notes" className="text-[11px]">
                    {t('signature.readiness.issue_notes', 'contracts')}
                </Label>
                <Input
                    id="signature_notes"
                    className="mt-1 h-8 text-xs"
                    value={form.data.notes}
                    onChange={(event) => form.setData('notes', event.target.value)}
                />
            </div>
            <Button type="submit" size="sm" disabled={form.processing}>
                {t('signature.actions.issue_package', 'contracts')}
            </Button>
        </form>
    );
}

function AddSignatoryForm({ contractId }: { contractId: string }) {
    const { t } = useLocale('contracts');
    const form = useForm<{
        signatory_type: string;
        name: string;
        email: string;
        title: string;
        sign_order: number;
        is_required: boolean;
        notes: string;
    }>({
        signatory_type: 'internal',
        name: '',
        email: '',
        title: '',
        sign_order: 0,
        is_required: true,
        notes: '',
    });

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        form.post(route('contracts.signatories.store', contractId), {
            preserveScroll: true,
        });
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 rounded-md border border-dashed p-4 text-sm">
            <div className="min-w-[120px]">
                <Label htmlFor="add_signatory_type" className="text-xs">
                    {t('signatory.type', 'contracts')}
                </Label>
                <Select
                    value={form.data.signatory_type}
                    onValueChange={(v) => form.setData('signatory_type', v)}
                >
                    <SelectTrigger id="add_signatory_type" className="mt-1 h-9 text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="internal">{t('signatory.types.internal', 'contracts')}</SelectItem>
                        <SelectItem value="supplier">{t('signatory.types.supplier', 'contracts')}</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="min-w-[180px]">
                <Label htmlFor="add_signatory_name" className="text-xs">
                    {t('signatory.name', 'contracts')}
                </Label>
                <Input
                    id="add_signatory_name"
                    className="mt-1 h-9 text-xs"
                    value={form.data.name}
                    onChange={(e) => form.setData('name', e.target.value)}
                    required
                />
            </div>
            <div className="min-w-[180px]">
                <Label htmlFor="add_signatory_email" className="text-xs">
                    {t('signatory.email', 'contracts')}
                </Label>
                <Input
                    id="add_signatory_email"
                    type="email"
                    className="mt-1 h-9 text-xs"
                    value={form.data.email}
                    onChange={(e) => form.setData('email', e.target.value)}
                />
            </div>
            <div className="min-w-[140px]">
                <Label htmlFor="add_signatory_title" className="text-xs">
                    {t('signatory.title', 'contracts')}
                </Label>
                <Input
                    id="add_signatory_title"
                    className="mt-1 h-9 text-xs"
                    value={form.data.title}
                    onChange={(e) => form.setData('title', e.target.value)}
                />
            </div>
            <div className="min-w-[80px]">
                <Label htmlFor="add_signatory_order" className="text-xs">
                    {t('signatory.sign_order', 'contracts')}
                </Label>
                <Input
                    id="add_signatory_order"
                    type="number"
                    min={0}
                    className="mt-1 h-9 text-xs"
                    value={form.data.sign_order}
                    onChange={(e) => form.setData('sign_order', parseInt(String(e.target.value), 10) || 0)}
                />
            </div>
            <div className="flex items-end gap-2">
                <label className="flex items-center gap-2 text-xs">
                    <input
                        type="checkbox"
                        checked={form.data.is_required}
                        onChange={(e) => form.setData('is_required', e.target.checked)}
                    />
                    {t('signatory.required', 'contracts')}
                </label>
            </div>
            <div className="min-w-[160px] flex-1">
                <Label htmlFor="add_signatory_notes" className="text-xs">
                    {t('signatory.notes', 'contracts')}
                </Label>
                <Input
                    id="add_signatory_notes"
                    className="mt-1 h-9 text-xs"
                    value={form.data.notes}
                    onChange={(e) => form.setData('notes', e.target.value)}
                />
            </div>
            <div className="flex items-end">
                <Button type="submit" size="sm" disabled={form.processing}>
                    {t('signatory.add_button', 'contracts')}
                </Button>
            </div>
        </form>
    );
}

function InitializeAdministrationForm({
    contractId,
    contractCurrency,
    contractValue,
    alreadyInitialized = false,
}: {
    contractId: string;
    contractCurrency: string;
    contractValue: string;
    alreadyInitialized?: boolean;
}) {
    const { t } = useLocale('contracts');
    const form = useForm<{
        effective_date: string;
        commencement_date: string;
        completion_date_planned: string;
        contract_value_final: string;
        currency_final: string;
        supplier_reference_no: string;
        administration_notes: string;
    }>({
        effective_date: '',
        commencement_date: '',
        completion_date_planned: '',
        contract_value_final: contractValue || '',
        currency_final: contractCurrency || '',
        supplier_reference_no: '',
        administration_notes: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            effective_date: form.data.effective_date || null,
            commencement_date: form.data.commencement_date || null,
            completion_date_planned: form.data.completion_date_planned || null,
            contract_value_final: form.data.contract_value_final,
            currency_final: form.data.currency_final,
            supplier_reference_no: form.data.supplier_reference_no || null,
            administration_notes: form.data.administration_notes || null,
        };
        router.post(route('contracts.initialize-administration', contractId), payload, { preserveScroll: true });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-3 text-sm">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                    <Label htmlFor="admin_effective_date" className="text-xs">{t('administration.effective_date', 'contracts')}</Label>
                    <Input id="admin_effective_date" type="date" className="mt-1 h-9 text-xs" value={formatDateForInput(form.data.effective_date)} onChange={(e) => form.setData('effective_date', e.target.value)} />
                </div>
                <div>
                    <Label htmlFor="admin_commencement_date" className="text-xs">{t('administration.commencement_date', 'contracts')}</Label>
                    <Input id="admin_commencement_date" type="date" className="mt-1 h-9 text-xs" value={formatDateForInput(form.data.commencement_date)} onChange={(e) => form.setData('commencement_date', e.target.value)} />
                </div>
                <div>
                    <Label htmlFor="admin_completion_date_planned" className="text-xs">{t('administration.completion_date_planned', 'contracts')}</Label>
                    <Input id="admin_completion_date_planned" type="date" className="mt-1 h-9 text-xs" value={formatDateForInput(form.data.completion_date_planned)} onChange={(e) => form.setData('completion_date_planned', e.target.value)} />
                </div>
                <div>
                    <Label htmlFor="admin_contract_value_final" className="text-xs">{t('administration.contract_value_final', 'contracts')} *</Label>
                    <Input id="admin_contract_value_final" type="number" step="0.01" min={0} className="mt-1 h-9 text-xs" value={form.data.contract_value_final} onChange={(e) => form.setData('contract_value_final', e.target.value)} required />
                </div>
                <div>
                    <Label htmlFor="admin_currency_final" className="text-xs">{t('administration.currency_final', 'contracts')} *</Label>
                    <Input id="admin_currency_final" className="mt-1 h-9 text-xs" value={form.data.currency_final} onChange={(e) => form.setData('currency_final', e.target.value)} required />
                </div>
                <div className="sm:col-span-2">
                    <Label htmlFor="admin_supplier_reference_no" className="text-xs">{t('administration.supplier_reference_no', 'contracts')}</Label>
                    <Input id="admin_supplier_reference_no" className="mt-1 h-9 text-xs" value={form.data.supplier_reference_no} onChange={(e) => form.setData('supplier_reference_no', e.target.value)} />
                </div>
            </div>
            <div>
                <Label htmlFor="admin_administration_notes" className="text-xs">{t('administration.administration_notes', 'contracts')}</Label>
                <Input id="admin_administration_notes" className="mt-1 h-9 text-xs" value={form.data.administration_notes} onChange={(e) => form.setData('administration_notes', e.target.value)} />
            </div>
            <Button type="submit" size="sm" disabled={form.processing}>
                {alreadyInitialized
                    ? t('administration.create_new_baseline_version', 'contracts')
                    : t('administration.initialize_button', 'contracts')}
            </Button>
        </form>
    );
}

interface Props {
    contract: ContractDetail;
    financials: {
        current_contract_value: number;
        approved_invoice_total: number;
        paid_invoice_total: number;
        outstanding_balance: number;
    };
    source: {
        rfq: {
            id: string;
            rfq_number: string;
            title: string | null;
            status: string;
        } | null;
        project: {
            id: string;
            name: string;
            name_en: string | null;
            code: string | null;
        } | null;
        package: {
            id: string;
            package_no: string | null;
            name: string;
        } | null;
        supplier: {
            id: string;
            legal_name_en: string;
            supplier_code: string | null;
        } | null;
        template: {
            id: string;
            code: string;
            name_en: string;
            name_ar: string;
        } | null;
    };
    administration: {
        status: string;
        initialized_at: string | null;
        initialized_by: { id: number; name: string } | null;
        effective_date: string | null;
        commencement_date: string | null;
        completion_date_planned: string | null;
        contract_value_final: string | null;
        currency_final: string | null;
        supplier_reference_no: string | null;
        administration_notes: string | null;
        readiness: { is_ready: boolean; issues: string[] };
        baseline_history: {
            id: string;
            baseline_version: number;
            administration_status: string;
            effective_date: string | null;
            commencement_date: string | null;
            completion_date_planned: string | null;
            contract_value_final: string | null;
            currency_final: string | null;
            prepared_by: { id: number; name: string } | null;
            prepared_at: string | null;
        }[];
    };
    variation_summary: {
        variation_count_total: number;
        variation_count_approved: number;
        variation_total_approved: string | null;
        variation_days_total_approved: number;
    };
    variation_eligibility: { is_ready: boolean; issues: string[] };
    variations: ContractVariationRow[];
    invoice_summary: {
        invoice_count_total: number;
        invoice_count_approved: number;
        invoice_count_paid: number;
        invoice_total_submitted: string | null;
        invoice_total_approved: string | null;
        invoice_total_paid: string | null;
    };
    invoice_eligibility: { is_ready: boolean; issues: string[] };
    invoices: ContractInvoiceRow[];
    closeout_summary: {
        closeout_status: string;
        closeout_initialized_at: string | null;
        closeout_initialized_by: { id: number; name: string } | null;
        closeout_completed_at: string | null;
        closeout_completed_by: { id: number; name: string } | null;
        practical_completion_at: string | null;
        final_completion_at: string | null;
        closeout_notes: string | null;
    };
    closeout_readiness: { is_ready: boolean; issues: string[] };
    closeout_history: {
        id: string;
        closeout_status: string;
        practical_completion_at: string | null;
        final_completion_at: string | null;
        closeout_notes: string | null;
        prepared_by: { id: number; name: string } | null;
        prepared_at: string | null;
    }[];
    warranty_summary: {
        defects_liability_start_at: string | null;
        defects_liability_end_at: string | null;
        warranty_status: string;
        warranty_initialized: boolean;
    };
    defect_eligibility: { is_ready: boolean; issues: string[] };
    defect_items: {
        id: string;
        reference_no: string;
        title: string;
        description: string | null;
        status: string;
        reported_at: string | null;
        resolved_at: string | null;
        closed_at: string | null;
        notes: string | null;
        created_by: { id: number; name: string } | null;
        events: {
            id: string;
            old_status: string | null;
            new_status: string | null;
            event_notes: string | null;
            changed_by: { id: number; name: string } | null;
            created_at: string | null;
        }[];
    }[];
    retention_summary: {
        retention_total_held: string | null;
        retention_total_pending: string | null;
        retention_total_released: string | null;
    };
    retention_eligibility: { is_ready: boolean; issues: string[] };
    retention_releases: {
        id: string;
        release_no: string;
        status: string;
        amount: string;
        currency: string;
        reason: string | null;
        submitted_at: string | null;
        submitted_by: { id: number; name: string } | null;
        approved_at: string | null;
        approved_by: { id: number; name: string } | null;
        rejected_at: string | null;
        rejected_by: { id: number; name: string } | null;
        released_at: string | null;
        released_by: { id: number; name: string } | null;
        decision_notes: string | null;
    }[];
    can: {
        send_signature: boolean;
        activate: boolean;
        complete: boolean;
        terminate: boolean;
        create_variation: boolean;
        approve_variation: boolean;
        create_invoice: boolean;
        approve_invoice: boolean;
        pay_invoice: boolean;
        issue_signature_package: boolean;
        manage_signatures: boolean;
        initialize_administration: boolean;
        initialize_closeout: boolean;
        complete_closeout: boolean;
        initialize_warranty: boolean;
        manage_defects: boolean;
        manage_retention: boolean;
        manage_claims: boolean;
        manage_notices: boolean;
        manage_securities: boolean;
        manage_obligations: boolean;
    };
    obligation_eligibility: { is_ready: boolean; issues: string[] };
    obligations_summary: { total: number; not_started: number; in_progress: number; submitted: number; fulfilled: number; overdue: number };
    contract_obligations: {
        id: string;
        reference_no: string;
        title: string;
        description: string | null;
        party_type: string;
        status: string;
        due_at: string | null;
        submitted_at: string | null;
        fulfilled_at: string | null;
        notes: string | null;
        is_overdue: boolean;
        created_by: { id: number; name: string } | null;
    }[];
    security_eligibility: { is_ready: boolean; issues: string[] };
    securities_summary: { total: number; active: number; expiring: number; expired: number; released: number };
    contract_securities: {
        id: string;
        instrument_type: string;
        status: string;
        provider_name: string;
        reference_no: string;
        amount: string | null;
        currency: string | null;
        issued_at: string | null;
        expires_at: string | null;
        released_at: string | null;
        notes: string | null;
        created_by: { id: number; name: string } | null;
    }[];
    claim_eligibility: { is_ready: boolean; issues: string[] };
    notice_eligibility: { is_ready: boolean; issues: string[] };
    claims_summary: { total: number; draft: number; submitted: number; under_review: number; resolved: number; rejected: number };
    notices_summary: { total: number; draft: number; issued: number; responded: number; closed: number };
    contract_claims: {
        id: string;
        claim_no: string;
        title: string;
        description: string | null;
        status: string;
        submitted_at: string | null;
        resolved_at: string | null;
        rejected_at: string | null;
        notes: string | null;
        created_by: { id: number; name: string } | null;
    }[];
    contract_notices: {
        id: string;
        notice_no: string;
        title: string;
        description: string | null;
        status: string;
        issued_at: string | null;
        responded_at: string | null;
        closed_at: string | null;
        notes: string | null;
        created_by: { id: number; name: string } | null;
    }[];
    signatories: {
        id: string;
        signatory_type: string;
        name: string;
        email: string | null;
        title: string | null;
        sign_order: number;
        is_required: boolean;
        status: string;
        signed_at: string | null;
        notes: string | null;
        created_by: { id: number; name: string } | null;
        updated_by: { id: number; name: string } | null;
    }[];
    signature_events: {
        id: string;
        event_type: string;
        event_notes: string | null;
        old_status: string | null;
        new_status: string | null;
        signatory: { id: string; name: string; signatory_type: string } | null;
        changed_by: { id: number; name: string } | null;
        created_at: string | null;
    }[];
    execution: {
        executed_at: string | null;
        executed_by: { id: number; name: string } | null;
    };
    signatory_summary: {
        total: number;
        signed: number;
        pending: number;
        declined: number;
        skipped: number;
    };
    timeline: TimelineEvent[];
    review: ContractReviewSummary;
    document_readiness_contract?: { is_ready: boolean; issues: string[] };
    document_readiness_signature?: { is_ready: boolean; issues: string[] };
    generated_documents?: {
        id: string;
        document_type: string;
        file_name: string;
        generation_source: string;
        snapshot_issue_version: number | null;
        generated_by: { id: number; name: string } | null;
        generated_at: string | null;
    }[];
    can_generate_documents?: boolean;
    signature: ContractSignaturePackageSummary;
    completeness?: ContractCompletenessPayload;
    /** Below-the-fold execution registers; loaded via Inertia::lazy partial reload. */
    contractDeferredExecution?: {
        retention_releases: Props['retention_releases'];
        contract_claims: Props['contract_claims'];
        contract_notices: Props['contract_notices'];
        contract_securities: Props['contract_securities'];
        contract_obligations: Props['contract_obligations'];
    };
}

const contractStatusBadgeClass: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    under_preparation: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    ready_for_review: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
    in_legal_review: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    in_commercial_review: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
    in_management_review: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    returned_for_rework: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
    approved_for_signature: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    signature_package_issued: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    awaiting_internal_signature: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    awaiting_supplier_signature: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
    partially_signed: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    fully_signed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    executed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    cancelled: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
    pending_signature: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    completed: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
    terminated: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

const genericStatusBadgeClass: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-700',
    submitted: 'bg-blue-100 text-blue-700',
    approved: 'bg-green-100 text-green-700',
    paid: 'bg-emerald-100 text-emerald-700',
    implemented: 'bg-indigo-100 text-indigo-700',
    rejected: 'bg-red-100 text-red-700',
    pending: 'bg-amber-100 text-amber-700',
    released: 'bg-emerald-100 text-emerald-700',
    under_review: 'bg-blue-100 text-blue-700',
    resolved: 'bg-emerald-100 text-emerald-700',
    issued: 'bg-blue-100 text-blue-700',
    responded: 'bg-teal-100 text-teal-700',
    closed: 'bg-slate-100 text-slate-700',
    active: 'bg-emerald-100 text-emerald-700',
    expiring: 'bg-amber-100 text-amber-700',
    expired: 'bg-slate-100 text-slate-700',
    not_started: 'bg-slate-100 text-slate-700',
    in_progress: 'bg-blue-100 text-blue-700',
    fulfilled: 'bg-emerald-100 text-emerald-700',
    overdue: 'bg-red-100 text-red-700',
};

function labelize(value: string): string {
    return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function snippet(value: string, max = 220): string {
    if (!value) return '';
    if (value.length <= max) return value;
    return `${value.slice(0, max)}…`;
}

function ContractCompletenessPanel({
    data,
    dir,
    t,
}: {
    data: ContractCompletenessPayload;
    dir: 'ltr' | 'rtl';
    t: (key: string, ns?: 'contracts', rep?: Record<string, string | number>) => string;
}) {
    const statusLabel =
        data.overall_status === 'blocked'
            ? t('completeness.overall_blocked', 'contracts')
            : data.overall_status === 'needs_attention'
              ? t('completeness.overall_needs_attention', 'contracts')
              : t('completeness.overall_ready', 'contracts');

    const statusClass =
        data.overall_status === 'blocked'
            ? 'border-red-300 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100'
            : data.overall_status === 'needs_attention'
              ? 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100'
              : 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100';

    const tagLabel = (tag: string): string => {
        const label = t(`completeness.risk_tags.${tag}`, 'contracts');
        if (label === `completeness.risk_tags.${tag}`) {
            return tag.replace(/_/g, ' ');
        }
        return label;
    };

    return (
        <Card className={`text-start ${statusClass}`} dir={dir}>
            <CardHeader className="pb-2">
                <CardTitle className="text-base">{t('completeness.title', 'contracts')}</CardTitle>
                <CardDescription>{t('completeness.subtitle', 'contracts')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                    {data.overall_status === 'blocked' && <XCircle className="h-5 w-5 shrink-0" aria-hidden />}
                    {data.overall_status === 'needs_attention' && <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden />}
                    {data.overall_status === 'ready' && <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden />}
                    <span className="font-semibold">{statusLabel}</span>
                </div>

                <div>
                    <p className="text-xs font-medium text-muted-foreground">{t('completeness.variables_label', 'contracts')}</p>
                    <p className="mt-1">
                        {t('completeness.variables_summary', 'contracts', {
                            filled: data.variables_filled,
                            total: data.variables_total,
                            percent: data.variables_percent,
                        })}
                    </p>
                    <div
                        className="mt-2 h-2 w-full overflow-hidden rounded-full bg-background/80"
                        role="progressbar"
                        aria-valuenow={data.variables_percent}
                        aria-valuemin={0}
                        aria-valuemax={100}
                    >
                        <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${data.variables_percent}%` }}
                        />
                    </div>
                </div>

                {data.mandatory_tags_required.length > 0 && (
                    <div>
                        <p className="text-xs font-medium text-muted-foreground">
                            {t('completeness.mandatory_clauses', 'contracts')}
                        </p>
                        <ul className="mt-2 space-y-1">
                            {data.mandatory_tags_required.map((tag) => {
                                const covered = data.mandatory_tags_covered.includes(tag);
                                return (
                                    <li key={tag} className="flex items-center gap-2">
                                        <span aria-hidden>{covered ? '✅' : '❌'}</span>
                                        <span>{tagLabel(tag)}</span>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                )}

                <div>
                    <p className="text-xs font-medium text-muted-foreground">{t('completeness.negotiated_articles', 'contracts')}</p>
                    <p className="mt-1">{data.negotiated_articles_count}</p>
                    {data.negotiated_articles_count > 0 && (
                        <p className="mt-1 text-xs text-amber-800 dark:text-amber-200">{t('completeness.negotiated_warning', 'contracts')}</p>
                    )}
                    {data.unresolved_negotiation_notes_count > 0 && (
                        <p className="mt-1 text-xs text-muted-foreground">
                            {t('completeness.negotiation_notes_open', 'contracts')}: {data.unresolved_negotiation_notes_count}
                        </p>
                    )}
                </div>

                {data.blocking_reasons.length > 0 && (
                    <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3">
                        <p className="font-medium text-destructive">{t('completeness.blocking_title', 'contracts')}</p>
                        <ul className="mt-2 list-inside list-disc space-y-1 text-xs">
                            {data.blocking_reasons.map((reason, i) => (
                                <li key={i}>{reason}</li>
                            ))}
                        </ul>
                        <p className="mt-2 text-xs text-muted-foreground">{t('completeness.submit_disabled_hint', 'contracts')}</p>
                    </div>
                )}

                {data.coverage_limitation_note && (
                    <p className="text-xs text-muted-foreground">{data.coverage_limitation_note}</p>
                )}
            </CardContent>
        </Card>
    );
}

const reviewStatusBadgeClass: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    under_preparation: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    ready_for_review: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
    in_legal_review: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    in_commercial_review: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
    in_management_review: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    returned_for_rework: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
    approved_for_signature: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    cancelled: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
};

export default function ContractsShow({
    contract,
    financials,
    can,
    timeline,
    source,
    review,
    signature,
    signatories,
    signature_events,
    execution,
    signatory_summary,
    administration,
    variation_summary,
    variation_eligibility,
    variations,
    invoice_summary,
    invoice_eligibility,
    invoices,
    closeout_summary,
    closeout_readiness,
    closeout_history,
    warranty_summary,
    defect_eligibility,
    defect_items,
    retention_summary,
    retention_eligibility,
    retention_releases,
    claim_eligibility,
    notice_eligibility,
    claims_summary,
    notices_summary,
    contract_claims,
    contract_notices,
    security_eligibility,
    securities_summary,
    contract_securities,
    obligation_eligibility,
    obligations_summary,
    contract_obligations,
    contractDeferredExecution,
    document_readiness_contract = { is_ready: false, issues: [] },
    document_readiness_signature = { is_ready: false, issues: [] },
    generated_documents = [],
    can_generate_documents = false,
    completeness,
}: Props) {
    const { userCan, dir } = usePage().props as SharedPageProps;
    const { t } = useLocale('contracts');

    const retention_releases_display = contractDeferredExecution?.retention_releases ?? retention_releases;
    const contract_claims_display = contractDeferredExecution?.contract_claims ?? contract_claims;
    const contract_notices_display = contractDeferredExecution?.contract_notices ?? contract_notices;
    const contract_securities_display = contractDeferredExecution?.contract_securities ?? contract_securities;
    const contract_obligations_display = contractDeferredExecution?.contract_obligations ?? contract_obligations;
    const isExecutionRegistersLoading = contractDeferredExecution == null;

    useEffect(() => {
        if (contractDeferredExecution != null) {
            return;
        }
        router.reload({ only: ['contractDeferredExecution'] });
    }, [contractDeferredExecution]);
    const canUseAiAssist = userCan?.['contract.manage'] === true;
    const [showTerminateReason, setShowTerminateReason] = useState(false);
    const [invoiceToReject, setInvoiceToReject] = useState<ContractInvoiceRow | null>(null);
    const [draftDiffArticle, setDraftDiffArticle] = useState<ContractDraftArticleRow | null>(null);
    const [aiPanelOpen, setAiPanelOpen] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiResult, setAiResult] = useState<AiSuggestResponse | null>(null);
    const [dismissedArticleIds, setDismissedArticleIds] = useState<Set<string>>(new Set());
    const [dismissedBlockKeys, setDismissedBlockKeys] = useState<Set<string>>(new Set());
    const [dismissedOptionKeys, setDismissedOptionKeys] = useState<Set<string>>(new Set());
    const aiInFlight = useRef(false);

    const linkedLibraryArticleIds = useMemo(() => {
        const ids = new Set<string>();
        for (const d of contract.draftArticles ?? []) {
            if (d.source_contract_article_id) {
                ids.add(d.source_contract_article_id);
            }
        }
        return ids;
    }, [contract.draftArticles]);

    const terminateForm = useForm({ reason: '' });
    const addArticleAiForm = useForm({ contract_article_id: '' });
    const rejectInvoiceForm = useForm({ decision_notes: '' });
    const variationForm = useForm({
        title: '',
        variation_type: 'commercial',
        reason: '',
        description: '',
        commercial_delta: '',
        currency: contract.currency ?? '',
        time_delta_days: '',
    });
    const invoiceForm = useForm({
        title: '',
        invoice_type: 'interim',
        description: '',
        amount: '',
        currency: contract.currency ?? '',
        period_from: '',
        period_to: '',
    });

    const canManageVariations = can.create_variation;
    const canSubmitVariation = can.create_variation;
    const canApproveVariation = can.approve_variation;
    const canManageInvoices = can.create_invoice;
    const canApproveInvoice = can.approve_invoice;
    const canPayInvoice = can.pay_invoice;

    const handleCreateVariation = (event: React.FormEvent) => {
        event.preventDefault();
        variationForm.post(route('contracts.variations.store', contract.id), {
            preserveScroll: true,
            onSuccess: () => variationForm.reset(),
        });
    };

    const handleCreateInvoice = (event: React.FormEvent) => {
        event.preventDefault();
        invoiceForm.post(route('contracts.invoices.store', contract.id), {
            preserveScroll: true,
            onSuccess: () => invoiceForm.reset(),
        });
    };

    const closeoutForm = useForm({
        practical_completion_at: '',
        final_completion_at: '',
        closeout_notes: '',
    });
    const handleInitializeCloseout = (event: React.FormEvent) => {
        event.preventDefault();
        closeoutForm.post(route('contracts.closeout.initialize', contract.id), {
            preserveScroll: true,
            onSuccess: () => closeoutForm.reset(),
        });
    };

    const warrantyForm = useForm({
        defects_liability_start_at: '',
        defects_liability_end_at: '',
    });
    const handleInitializeWarranty = (event: React.FormEvent) => {
        event.preventDefault();
        warrantyForm.post(route('contracts.defects.initialize-warranty', contract.id), {
            preserveScroll: true,
            onSuccess: () => warrantyForm.reset(),
        });
    };

    const defectForm = useForm({
        title: '',
        description: '',
        notes: '',
    });
    const handleCreateDefect = (event: React.FormEvent) => {
        event.preventDefault();
        defectForm.post(route('contracts.defects.store', contract.id), {
            preserveScroll: true,
            onSuccess: () => defectForm.reset(),
        });
    };

    const retentionForm = useForm({
        amount: '',
        currency: contract?.currency ?? 'SAR',
        reason: '',
    });
    const handleCreateRetention = (event: React.FormEvent) => {
        event.preventDefault();
        retentionForm.post(route('contracts.retention.store', contract.id), {
            preserveScroll: true,
            onSuccess: () => retentionForm.reset(),
        });
    };

    const claimForm = useForm({ title: '', description: '', notes: '' });
    const handleCreateClaim = (event: React.FormEvent) => {
        event.preventDefault();
        claimForm.post(route('contracts.claims.store', contract.id), { preserveScroll: true, onSuccess: () => claimForm.reset() });
    };

    const noticeForm = useForm({ title: '', description: '', notes: '' });
    const handleCreateNotice = (event: React.FormEvent) => {
        event.preventDefault();
        noticeForm.post(route('contracts.notices.store', contract.id), { preserveScroll: true, onSuccess: () => noticeForm.reset() });
    };

    const securityForm = useForm({
        instrument_type: 'performance_bond',
        provider_name: '',
        reference_no: '',
        amount: '',
        currency: contract?.currency ?? 'SAR',
        issued_at: '',
        expires_at: '',
        notes: '',
    });
    const handleCreateSecurity = (event: React.FormEvent) => {
        event.preventDefault();
        securityForm.post(route('contracts.securities.store', contract.id), { preserveScroll: true, onSuccess: () => securityForm.reset() });
    };

    const obligationForm = useForm({
        title: '',
        description: '',
        party_type: 'internal',
        due_at: '',
        notes: '',
    });
    const handleCreateObligation = (event: React.FormEvent) => {
        event.preventDefault();
        obligationForm.post(route('contracts.obligations.store', contract.id), { preserveScroll: true, onSuccess: () => obligationForm.reset() });
    };

    const handleRejectInvoice = (event: React.FormEvent) => {
        event.preventDefault();
        if (!invoiceToReject) return;
        rejectInvoiceForm.post(route('contracts.invoices.reject', [contract.id, invoiceToReject.id]), {
            preserveScroll: true,
            onSuccess: () => {
                setInvoiceToReject(null);
                rejectInvoiceForm.reset();
            },
        });
    };

    const fetchAiSuggestions = useCallback(async () => {
        if (aiInFlight.current) {
            return;
        }
        aiInFlight.current = true;
        setAiLoading(true);
        setAiPanelOpen(true);
        try {
            const csrf =
                (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement | null)?.content ?? '';
            const res = await fetch(route('contracts.ai-suggest', contract.id), {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrf,
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin',
            });
            const json = (await res.json()) as AiSuggestResponse;
            setAiResult(json);
        } catch {
            setAiResult({
                suggested_articles: [],
                suggested_blocks: [],
                missing_block_categories: [],
                option_recommendations: [],
                suggested_template_id: null,
                suggested_template_reason: null,
                missing_variables: [],
                risk_flags: [],
                error: t('ai_assist.error_generic', 'contracts'),
            });
        } finally {
            setAiLoading(false);
            aiInFlight.current = false;
        }
    }, [contract.id, t]);

    const aiBlockKey = (articleId: string, blockId: string) => `${articleId}:${blockId}`;

    const handleAiAddArticle = (articleId: string) => {
        addArticleAiForm.setData('contract_article_id', articleId);
        addArticleAiForm.post(route('contracts.add-article', contract.id), {
            preserveScroll: true,
            onSuccess: () => {
                setDismissedArticleIds((prev) => {
                    const next = new Set(prev);
                    next.add(articleId);
                    return next;
                });
                setDismissedBlockKeys((prev) => {
                    const next = new Set(prev);
                    for (const b of aiResult?.suggested_blocks ?? []) {
                        if (b.article_id === articleId) {
                            next.add(aiBlockKey(b.article_id, b.block_id));
                        }
                    }
                    return next;
                });
                setDismissedOptionKeys((prev) => {
                    const next = new Set(prev);
                    for (const o of aiResult?.option_recommendations ?? []) {
                        if (o.article_id === articleId) {
                            next.add(aiBlockKey(o.article_id, o.block_id));
                        }
                    }
                    return next;
                });
            },
        });
    };

    const confidenceBadgeClass = (c: string): string => {
        const v = c.toLowerCase();
        if (v === 'high') return 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100';
        if (v === 'low') return 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100';
        return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100';
    };

    const confidenceLabel = (c: string): string => {
        const v = c.toLowerCase();
        if (v === 'high') return t('ai_assist.confidence_high', 'contracts');
        if (v === 'low') return t('ai_assist.confidence_low', 'contracts');
        return t('ai_assist.confidence_medium', 'contracts');
    };

    return (
        <AppLayout>
            <Head title={`Contract ${contract.contract_number}`} />
            <div className="space-y-6">
                <nav className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Link href={route('contracts.index')} className="hover:text-foreground">
                        Contracts
                    </Link>
                    <ChevronRight className="h-4 w-4" />
                    <span className="font-medium text-foreground">{contract.contract_number}</span>
                </nav>

                {completeness && (
                    <ContractCompletenessPanel data={completeness} dir={dir ?? 'ltr'} t={t} />
                )}

                <Card>
                    <CardHeader>
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                                <CardTitle>{contract.contract_number}</CardTitle>
                                <CardDescription>
                                    {contract.title_en && <span className="block">{contract.title_en}</span>}
                                    {contract.title_ar && (
                                        <span className="block text-xs text-muted-foreground">{contract.title_ar}</span>
                                    )}
                                </CardDescription>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="outline" className={contractStatusBadgeClass[contract.status] ?? ''}>
                                    {labelize(contract.status)}
                                </Badge>
                                {can.send_signature && contract.status === 'draft' && (
                                    <Button onClick={() => router.post(route('contracts.send-signature', contract.id), {}, { preserveScroll: true })}>
                                        Send for Signature
                                    </Button>
                                )}
                                {can.activate && contract.status === 'pending_signature' && (
                                    <Button onClick={() => router.post(route('contracts.activate', contract.id), {}, { preserveScroll: true })}>
                                        Activate
                                    </Button>
                                )}
                                {can.complete && contract.status === 'active' && (
                                    <Button variant="outline" onClick={() => router.post(route('contracts.complete', contract.id), {}, { preserveScroll: true })}>
                                        Mark Completed
                                    </Button>
                                )}
                                {can.terminate && contract.status === 'active' && (
                                    <Button variant="destructive" onClick={() => setShowTerminateReason((value) => !value)}>
                                        Terminate
                                    </Button>
                                )}
                            </div>
                        </div>
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                asChild
                            >
                                <Link href={route('contracts.edit', contract.id)}>
                                    {t('workspace.breadcrumb.edit', 'contracts')}
                                </Link>
                            </Button>
                            {canUseAiAssist && (
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    disabled={aiLoading}
                                    onClick={() => void fetchAiSuggestions()}
                                    className="gap-1.5"
                                    aria-busy={aiLoading}
                                    aria-label={t('ai_assist.title', 'contracts')}
                                >
                                    <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                    {aiLoading ? t('ai_assist.loading', 'contracts') : t('ai_assist.button', 'contracts')}
                                </Button>
                            )}
                        </div>
                        {canUseAiAssist && aiPanelOpen && (
                            <div
                                className="mt-4 rounded-lg border border-border bg-muted/30 p-4 text-start"
                                dir={dir}
                            >
                                <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                                    <div>
                                        <p className="text-sm font-semibold">{t('ai_assist.panel_title', 'contracts')}</p>
                                        <p className="text-xs text-muted-foreground">{t('ai_assist.subtitle', 'contracts')}</p>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-xs"
                                        onClick={() => setAiPanelOpen(false)}
                                    >
                                        {t('ai_assist.dismiss', 'contracts')}
                                    </Button>
                                </div>
                                {aiLoading && (
                                    <p className="text-sm text-muted-foreground">{t('ai_assist.loading', 'contracts')}</p>
                                )}
                                {!aiLoading && aiResult?.error && (
                                    <p className="text-sm text-amber-800 dark:text-amber-200">{aiResult.error}</p>
                                )}
                                {!aiLoading && aiResult && (
                                    <div className="space-y-6">
                                        <div>
                                            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                                {t('ai_assist.suggested_articles', 'contracts')}
                                            </p>
                                            {(!aiResult.suggested_articles ||
                                                aiResult.suggested_articles.filter((a) => !dismissedArticleIds.has(a.article_id))
                                                    .length === 0) && (
                                                <p className="text-sm text-muted-foreground">{t('ai_assist.no_articles', 'contracts')}</p>
                                            )}
                                            <ul className="space-y-3">
                                                {aiResult.suggested_articles
                                                    ?.filter((a) => !dismissedArticleIds.has(a.article_id))
                                                    .map((row) => (
                                                        <li
                                                            key={row.article_id}
                                                            className="rounded-md border border-border bg-background p-3 shadow-sm"
                                                        >
                                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                                <div className="min-w-0 flex-1">
                                                                    <p className="font-mono text-xs text-muted-foreground">
                                                                        {row.article_code ?? row.article_id.slice(0, 8)}
                                                                    </p>
                                                                    <p className="text-sm font-medium leading-snug">
                                                                        {row.title_en ?? '—'}
                                                                    </p>
                                                                    <p className="mt-1 text-xs text-muted-foreground">{row.reason}</p>
                                                                </div>
                                                                <div className="flex shrink-0 flex-col items-end gap-1">
                                                                    <Badge
                                                                        variant="outline"
                                                                        className={confidenceBadgeClass(row.confidence)}
                                                                    >
                                                                        {confidenceLabel(row.confidence)}
                                                                    </Badge>
                                                                    {row.is_mandatory && (
                                                                        <Badge variant="secondary" className="text-[10px]">
                                                                            {t('ai_assist.mandatory', 'contracts')}
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="mt-3 flex flex-wrap gap-2">
                                                                <Button
                                                                    type="button"
                                                                    size="sm"
                                                                    variant="default"
                                                                    disabled={addArticleAiForm.processing}
                                                                    onClick={() => handleAiAddArticle(row.article_id)}
                                                                >
                                                                    {t('ai_assist.add_article', 'contracts')}
                                                                </Button>
                                                                <Button
                                                                    type="button"
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() =>
                                                                        setDismissedArticleIds((prev) => {
                                                                            const next = new Set(prev);
                                                                            next.add(row.article_id);
                                                                            return next;
                                                                        })
                                                                    }
                                                                >
                                                                    {t('ai_assist.dismiss', 'contracts')}
                                                                </Button>
                                                            </div>
                                                        </li>
                                                    ))}
                                            </ul>
                                        </div>
                                        <div>
                                            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                                {t('ai_assist.suggested_blocks', 'contracts')}
                                            </p>
                                            <p className="mb-2 text-xs text-muted-foreground">
                                                {t('ai_assist.suggested_blocks_hint', 'contracts')}
                                            </p>
                                            {(!aiResult.suggested_blocks ||
                                                aiResult.suggested_blocks.filter(
                                                    (b) => !dismissedBlockKeys.has(aiBlockKey(b.article_id, b.block_id))
                                                ).length === 0) && (
                                                <p className="text-sm text-muted-foreground">
                                                    {t('ai_assist.no_block_suggestions', 'contracts')}
                                                </p>
                                            )}
                                            <ul className="space-y-3">
                                                {aiResult.suggested_blocks
                                                    ?.filter((b) => !dismissedBlockKeys.has(aiBlockKey(b.article_id, b.block_id)))
                                                    .map((row) => (
                                                        <li
                                                            key={aiBlockKey(row.article_id, row.block_id)}
                                                            className="rounded-md border border-border bg-background p-3 shadow-sm"
                                                        >
                                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                                <div className="min-w-0 flex-1">
                                                                    <p className="font-mono text-xs text-muted-foreground">
                                                                        {row.article_code ?? row.article_id.slice(0, 8)} ·{' '}
                                                                        <span className="text-[10px]">{row.block_id.slice(0, 8)}…</span>
                                                                    </p>
                                                                    <p className="text-sm font-medium leading-snug">
                                                                        {row.block_title_en ?? '—'}
                                                                    </p>
                                                                    <div className="mt-1 flex flex-wrap gap-1">
                                                                        {row.block_type && (
                                                                            <Badge variant="secondary" className="text-[10px]">
                                                                                {t(
                                                                                    `block_type_${row.block_type}`,
                                                                                    'contract_articles'
                                                                                )}
                                                                            </Badge>
                                                                        )}
                                                                        {row.is_mandatory && (
                                                                            <Badge variant="secondary" className="text-[10px]">
                                                                                {t('ai_assist.mandatory', 'contracts')}
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                    <p className="mt-1 text-xs text-muted-foreground">{row.reason}</p>
                                                                </div>
                                                                <Badge
                                                                    variant="outline"
                                                                    className={confidenceBadgeClass(row.confidence)}
                                                                >
                                                                    {confidenceLabel(row.confidence)}
                                                                </Badge>
                                                            </div>
                                                            <div className="mt-3 flex flex-wrap gap-2">
                                                                {!linkedLibraryArticleIds.has(row.article_id) && (
                                                                    <Button
                                                                        type="button"
                                                                        size="sm"
                                                                        variant="default"
                                                                        disabled={addArticleAiForm.processing}
                                                                        onClick={() => handleAiAddArticle(row.article_id)}
                                                                    >
                                                                        {t('ai_assist.add_article', 'contracts')}
                                                                    </Button>
                                                                )}
                                                                <Button type="button" size="sm" variant="outline" asChild>
                                                                    <Link
                                                                        href={route('contract-articles.show', row.article_id)}
                                                                    >
                                                                        {t('ai_assist.open_library_article', 'contracts')}
                                                                    </Link>
                                                                </Button>
                                                                <Button type="button" size="sm" variant="outline" asChild>
                                                                    <Link href={route('contracts.edit', contract.id)}>
                                                                        {t('ai_assist.open_workspace', 'contracts')}
                                                                    </Link>
                                                                </Button>
                                                                <Button
                                                                    type="button"
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={() =>
                                                                        setDismissedBlockKeys((prev) => {
                                                                            const next = new Set(prev);
                                                                            next.add(aiBlockKey(row.article_id, row.block_id));
                                                                            return next;
                                                                        })
                                                                    }
                                                                >
                                                                    {t('ai_assist.dismiss', 'contracts')}
                                                                </Button>
                                                            </div>
                                                        </li>
                                                    ))}
                                            </ul>
                                        </div>
                                        <div>
                                            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                                {t('ai_assist.option_recommendations', 'contracts')}
                                            </p>
                                            {(!aiResult.option_recommendations ||
                                                aiResult.option_recommendations.filter(
                                                    (o) => !dismissedOptionKeys.has(aiBlockKey(o.article_id, o.block_id))
                                                ).length === 0) ? (
                                                <p className="text-sm text-muted-foreground">—</p>
                                            ) : (
                                            <ul className="space-y-3">
                                                {aiResult.option_recommendations
                                                    ?.filter((o) => !dismissedOptionKeys.has(aiBlockKey(o.article_id, o.block_id)))
                                                    .map((row) => (
                                                        <li
                                                            key={`opt-${aiBlockKey(row.article_id, row.block_id)}`}
                                                            className="rounded-md border border-dashed border-border bg-background/80 p-3 text-sm"
                                                        >
                                                            <p className="font-mono text-xs text-muted-foreground">
                                                                {row.article_code ?? row.article_id.slice(0, 8)}
                                                            </p>
                                                            <p className="font-medium">{row.block_title_en ?? '—'}</p>
                                                            <p className="mt-1 text-xs text-muted-foreground">{row.reason}</p>
                                                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                                                <Badge
                                                                    variant="outline"
                                                                    className={confidenceBadgeClass(row.confidence)}
                                                                >
                                                                    {confidenceLabel(row.confidence)}
                                                                </Badge>
                                                                {row.recommended_option_key && (
                                                                    <Badge variant="secondary" className="text-[10px]">
                                                                        {t('ai_assist.recommended_option', 'contracts')}:{' '}
                                                                        {row.recommended_option_key}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <div className="mt-2 flex flex-wrap gap-2">
                                                                <Button type="button" size="sm" variant="outline" asChild>
                                                                    <Link href={route('contracts.edit', contract.id)}>
                                                                        {t('ai_assist.open_workspace', 'contracts')}
                                                                    </Link>
                                                                </Button>
                                                                <Button
                                                                    type="button"
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={() =>
                                                                        setDismissedOptionKeys((prev) => {
                                                                            const next = new Set(prev);
                                                                            next.add(aiBlockKey(row.article_id, row.block_id));
                                                                            return next;
                                                                        })
                                                                    }
                                                                >
                                                                    {t('ai_assist.dismiss', 'contracts')}
                                                                </Button>
                                                            </div>
                                                        </li>
                                                    ))}
                                            </ul>
                                            )}
                                        </div>
                                        <div>
                                            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                                {t('ai_assist.missing_block_categories', 'contracts')}
                                            </p>
                                            {aiResult.missing_block_categories?.length ? (
                                                <ul className="flex flex-wrap gap-2">
                                                    {aiResult.missing_block_categories.map((cat) => (
                                                        <li key={cat}>
                                                            <Badge variant="outline" className="text-xs font-normal">
                                                                {cat}
                                                            </Badge>
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <p className="text-sm text-muted-foreground">—</p>
                                            )}
                                        </div>
                                        <div>
                                            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                                {t('ai_assist.suggested_template', 'contracts')}
                                            </p>
                                            {aiResult.suggested_template_id || aiResult.suggested_template_reason ? (
                                                <div className="rounded-md border border-dashed border-border bg-background/80 p-3 text-sm">
                                                    <p className="font-medium">
                                                        {aiResult.suggested_template_code ??
                                                            aiResult.suggested_template_name_en ??
                                                            aiResult.suggested_template_id ??
                                                            '—'}
                                                    </p>
                                                    {aiResult.suggested_template_reason && (
                                                        <p className="mt-1 text-muted-foreground">{aiResult.suggested_template_reason}</p>
                                                    )}
                                                    <p className="mt-2 text-xs text-muted-foreground">{t('ai_assist.template_advisory', 'contracts')}</p>
                                                    <Button variant="link" className="mt-1 h-auto px-0 text-xs" asChild>
                                                        <Link href={route('contracts.edit', contract.id)}>
                                                            {t('ai_assist.open_workspace', 'contracts')}
                                                        </Link>
                                                    </Button>
                                                </div>
                                            ) : (
                                                <p className="text-sm text-muted-foreground">—</p>
                                            )}
                                        </div>
                                        <div>
                                            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                                {t('ai_assist.missing_variables', 'contracts')}
                                            </p>
                                            {aiResult.missing_variables?.length ? (
                                                <ul className="space-y-1 text-sm">
                                                    {aiResult.missing_variables.map((mv) => (
                                                        <li
                                                            key={mv.key}
                                                            className="flex flex-wrap items-center justify-between gap-2 rounded border border-border/60 px-2 py-1"
                                                        >
                                                            <span className="font-mono text-xs">{mv.key}</span>
                                                            <span className="min-w-0 flex-1 text-muted-foreground">{mv.label}</span>
                                                            <Badge variant="outline" className="text-[10px]">
                                                                {mv.source === 'manual'
                                                                    ? t('ai_assist.source_manual', 'contracts')
                                                                    : t('ai_assist.source_system', 'contracts')}
                                                            </Badge>
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <p className="text-sm text-muted-foreground">—</p>
                                            )}
                                        </div>
                                        <div>
                                            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                                {t('ai_assist.risk_flags', 'contracts')}
                                            </p>
                                            <p className="mb-2 text-xs text-muted-foreground">{t('ai_assist.risk_disclaimer', 'contracts')}</p>
                                            {aiResult.risk_flags?.length ? (
                                                <ul className="list-inside list-disc space-y-1 text-sm text-amber-900 dark:text-amber-100">
                                                    {aiResult.risk_flags.map((flag, i) => (
                                                        <li key={i}>{flag}</li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <p className="text-sm text-muted-foreground">—</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        {showTerminateReason && can.terminate && contract.status === 'active' && (
                            <form
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    terminateForm.post(route('contracts.terminate', contract.id), {
                                        preserveScroll: true,
                                        onSuccess: () => {
                                            setShowTerminateReason(false);
                                            terminateForm.reset();
                                        },
                                    });
                                }}
                                className="mt-4 flex flex-col gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 md:flex-row"
                            >
                                <Input
                                    placeholder="Termination reason"
                                    value={terminateForm.data.reason}
                                    onChange={(event) => terminateForm.setData('reason', event.target.value)}
                                    required
                                />
                                <Button type="submit" variant="destructive" disabled={terminateForm.processing}>
                                    Confirm Termination
                                </Button>
                            </form>
                        )}
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <div>
                                <p className="text-sm text-muted-foreground">Supplier</p>
                                <p className="mt-1 font-medium">{contract.supplier?.legal_name_en ?? '—'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Base Contract Value</p>
                                <p className="mt-1 font-medium tabular-nums">
                                    {contract.currency} {parseFloat(contract.contract_value).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Signed At</p>
                                <p className="mt-1 font-medium">{contract.signed_at ? new Date(contract.signed_at).toLocaleDateString() : '—'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">RFQ Status</p>
                                <p className="mt-1 font-medium">{contract.rfq ? labelize(contract.rfq.status) : '—'}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('documents.title', 'contracts')}</CardTitle>
                        <CardDescription>{t('documents.description', 'contracts')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="text-sm">
                            <p className="font-medium text-muted-foreground">{t('documents.readiness', 'contracts')}</p>
                            {!document_readiness_contract.is_ready && (
                                <ul className="mt-1 list-inside list-disc text-amber-700 dark:text-amber-300">
                                    {document_readiness_contract.issues.map((issue, i) => (
                                        <li key={i}>{issue}</li>
                                    ))}
                                </ul>
                            )}
                            {document_readiness_contract.is_ready && (
                                <p className="mt-1 text-muted-foreground">{t('documents.ready', 'contracts')}</p>
                            )}
                        </div>
                        {can_generate_documents && (
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={!document_readiness_contract.is_ready}
                                    onClick={() => router.post(route('contracts.documents.generate-contract-docx', contract.id), {}, { preserveScroll: true })}
                                >
                                    {t('documents.generate_docx', 'contracts')}
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={!document_readiness_contract.is_ready}
                                    onClick={() => router.post(route('contracts.documents.generate-contract-pdf', contract.id), {}, { preserveScroll: true })}
                                >
                                    {t('documents.generate_pdf', 'contracts')}
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={!document_readiness_signature.is_ready}
                                    onClick={() => router.post(route('contracts.documents.generate-signature-docx', contract.id), {}, { preserveScroll: true })}
                                >
                                    {t('documents.generate_signature_docx', 'contracts')}
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={!document_readiness_signature.is_ready}
                                    onClick={() => router.post(route('contracts.documents.generate-signature-pdf', contract.id), {}, { preserveScroll: true })}
                                >
                                    {t('documents.generate_signature_pdf', 'contracts')}
                                </Button>
                            </div>
                        )}
                        {signature.current_issue_package && (
                            <p className="text-xs text-muted-foreground">
                                {t('documents.signature_binds_to', 'contracts')} v{signature.current_issue_package.issue_version}.
                            </p>
                        )}
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">{t('documents.generated_files', 'contracts')}</p>
                            {generated_documents.length === 0 ? (
                                <p className="mt-2 text-sm text-muted-foreground">{t('documents.no_documents', 'contracts')}</p>
                            ) : (
                                <div className="mt-2 overflow-x-auto rounded-md border">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted/50">
                                            <tr>
                                                <th className="px-3 py-2 text-left font-medium">{t('documents.type', 'contracts')}</th>
                                                <th className="px-3 py-2 text-left font-medium">{t('documents.file_name', 'contracts')}</th>
                                                <th className="px-3 py-2 text-left font-medium">{t('documents.generation_source', 'contracts')}</th>
                                                <th className="px-3 py-2 text-left font-medium">{t('documents.issue_version', 'contracts')}</th>
                                                <th className="px-3 py-2 text-left font-medium">{t('documents.generated_by', 'contracts')}</th>
                                                <th className="px-3 py-2 text-left font-medium">{t('documents.generated_at', 'contracts')}</th>
                                                <th className="px-3 py-2 text-right font-medium">{t('documents.download', 'contracts')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {generated_documents.map((d) => (
                                                <tr key={d.id} className="border-t border-border">
                                                    <td className="px-3 py-2">{t(`documents.type_${d.document_type}`, 'contracts')}</td>
                                                    <td className="px-3 py-2 font-mono text-xs">{d.file_name}</td>
                                                    <td className="px-3 py-2">{d.generation_source === 'signature_package' ? t('documents.signature_package_document', 'contracts') : t('documents.contract_document', 'contracts')}</td>
                                                    <td className="px-3 py-2">{d.snapshot_issue_version ?? '—'}</td>
                                                    <td className="px-3 py-2">{d.generated_by?.name ?? '—'}</td>
                                                    <td className="px-3 py-2">{d.generated_at ? new Date(d.generated_at).toLocaleString() : '—'}</td>
                                                    <td className="px-3 py-2 text-right">
                                                        <a
                                                            href={route('contracts.documents.download', { contract: contract.id, document: d.id })}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-sm text-primary underline hover:no-underline"
                                                        >
                                                            {t('documents.download', 'contracts')}
                                                        </a>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('signature.summary.title', 'contracts')}</CardTitle>
                        <CardDescription>
                            {t('signature.summary.description', 'contracts')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 text-sm">
                            <div>
                                <p className="text-xs text-muted-foreground">
                                    {t('signature.summary.status', 'contracts')}
                                </p>
                                <p className="mt-1 font-medium">
                                    <Badge
                                        variant="outline"
                                        className={contractStatusBadgeClass[signature.status] ?? ''}
                                    >
                                        {labelize(signature.status)}
                                    </Badge>
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">
                                    {t('signature.summary.locked', 'contracts')}
                                </p>
                                <p className="mt-1 font-medium">
                                    {signature.is_locked_for_signature
                                        ? t('signature.labels.yes', 'contracts')
                                        : t('signature.labels.no', 'contracts')}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">
                                    {t('signature.summary.finalized_at', 'contracts')}
                                </p>
                                <p className="mt-1 font-medium">
                                    {signature.finalized_for_signature_at
                                        ? new Date(signature.finalized_for_signature_at).toLocaleString()
                                        : '—'}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">
                                    {t('signature.summary.finalized_by', 'contracts')}
                                </p>
                                <p className="mt-1 font-medium">
                                    {signature.finalized_for_signature_by?.name ?? '—'}
                                </p>
                            </div>
                        </div>
                        {signature.current_issue_package && (
                            <div className="mt-4 rounded-md border px-4 py-3 text-sm">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <p className="text-xs text-muted-foreground">
                                            {t('signature.readiness.current_issue_version', 'contracts')}
                                        </p>
                                        <p className="mt-1 font-medium">
                                            v{signature.current_issue_package.issue_version} ·{' '}
                                            {labelize(signature.current_issue_package.package_status)} ·{' '}
                                            {signature.current_issue_package.snapshot_article_count} articles
                                        </p>
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {signature.current_issue_package.prepared_at
                                            ? new Date(
                                                  signature.current_issue_package.prepared_at,
                                              ).toLocaleString()
                                            : ''}
                                        {signature.current_issue_package.prepared_by && (
                                            <>
                                                {' · '}
                                                {signature.current_issue_package.prepared_by.name}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                        <div className="mt-4 rounded-md border">
                            <div className="border-b bg-muted/60 px-4 py-2 text-xs font-medium">
                                {t('signature.history.title', 'contracts')}
                            </div>
                            <div className="max-h-40 overflow-y-auto text-xs">
                                {signature.issue_history.length === 0 && (
                                    <div className="px-4 py-3 text-muted-foreground">
                                        {t('signature.history.empty', 'contracts')}
                                    </div>
                                )}
                                {signature.issue_history.map((pkg) => (
                                    <div
                                        key={pkg.id}
                                        className="border-b px-4 py-2 last:border-b-0"
                                    >
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Badge
                                                    variant="outline"
                                                    className={
                                                        pkg.package_status === 'issued'
                                                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                                                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                                    }
                                                >
                                                    v{pkg.issue_version} · {labelize(pkg.package_status)}
                                                </Badge>
                                                <span>
                                                    {pkg.snapshot_article_count} articles
                                                </span>
                                            </div>
                                            <span className="text-[11px] text-muted-foreground">
                                                {pkg.prepared_at
                                                    ? new Date(pkg.prepared_at).toLocaleString()
                                                    : ''}
                                            </span>
                                        </div>
                                        {pkg.notes && (
                                            <div className="mt-1 text-[11px] text-muted-foreground">
                                                {pkg.notes}
                                            </div>
                                        )}
                                        {pkg.prepared_by && (
                                            <div className="mt-0.5 text-[11px] text-muted-foreground">
                                                {t('signature.history.prepared_by', 'contracts', {
                                                    name: pkg.prepared_by.name,
                                                })}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                            {can.issue_signature_package &&
                                signature.status === 'approved_for_signature' &&
                                !signature.is_locked_for_signature && (
                                    <div className="mt-4 rounded-md border border-dashed px-4 py-3 text-xs">
                                        <p className="mb-2 font-medium">
                                            {t('signature.readiness.title', 'contracts')}
                                        </p>
                                        {signature.readiness.is_ready ? (
                                            <>
                                                <p className="mb-2 text-muted-foreground">
                                                    {t('signature.readiness.ready_to_issue', 'contracts')}
                                                </p>
                                                <IssueSignaturePackageForm contractId={contract.id} />
                                            </>
                                        ) : (
                                            <>
                                                <p className="mb-1 text-muted-foreground">
                                                    {t('signature.readiness.blocking_issues_found', 'contracts')}
                                                </p>
                                                {signature.readiness.issues.length > 0 ? (
                                                    <ul className="mb-2 list-disc pl-5 text-[11px] text-muted-foreground">
                                                        {signature.readiness.issues.map((issue) => (
                                                            <li key={issue}>{issue}</li>
                                                        ))}
                                                    </ul>
                                                ) : (
                                                    <p className="mb-2 text-[11px] text-muted-foreground">
                                                        {t('signature.readiness.no_blocking_issues', 'contracts')}
                                                    </p>
                                                )}
                                            </>
                                        )}
                                    </div>
                                )}
                        </div>
                    </CardContent>
                </Card>

                {(signature.is_locked_for_signature || [
                    'awaiting_internal_signature',
                    'awaiting_supplier_signature',
                    'partially_signed',
                    'fully_signed',
                    'executed',
                ].includes(contract.status)) && (
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('signatory.progress_title', 'contracts')}</CardTitle>
                            <CardDescription>
                                {t('signatory.progress_description', 'contracts')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 text-sm">
                                <div>
                                    <p className="text-xs text-muted-foreground">{t('signatory.summary.total', 'contracts')}</p>
                                    <p className="mt-1 font-medium">{signatory_summary.total}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">{t('signatory.summary.signed', 'contracts')}</p>
                                    <p className="mt-1 font-medium text-green-600 dark:text-green-400">{signatory_summary.signed}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">{t('signatory.summary.pending', 'contracts')}</p>
                                    <p className="mt-1 font-medium">{signatory_summary.pending}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">{t('signatory.summary.declined', 'contracts')}</p>
                                    <p className="mt-1 font-medium text-amber-600 dark:text-amber-400">{signatory_summary.declined}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">{t('signatory.summary.skipped', 'contracts')}</p>
                                    <p className="mt-1 font-medium text-muted-foreground">{signatory_summary.skipped}</p>
                                </div>
                            </div>
                            {execution.executed_at && (
                                <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm">
                                    <p className="text-xs text-muted-foreground">{t('execution.executed_at', 'contracts')}</p>
                                    <p className="mt-1 font-medium">
                                        {new Date(execution.executed_at).toLocaleString()}
                                        {execution.executed_by && ` · ${execution.executed_by.name}`}
                                    </p>
                                </div>
                            )}
                            {can.manage_signatures &&
                                contract.status !== 'executed' &&
                                (signature.is_locked_for_signature ||
                                    ['signature_package_issued', 'awaiting_internal_signature', 'awaiting_supplier_signature', 'partially_signed', 'fully_signed'].includes(
                                        contract.status
                                    )) && (
                                <AddSignatoryForm contractId={contract.id} />
                            )}
                            <div className="rounded-md border">
                                <div className="border-b bg-muted/60 px-4 py-2 text-xs font-medium">
                                    {t('signatory.table_title', 'contracts')}
                                </div>
                                <div className="overflow-x-auto">
                                    {signatories.length === 0 ? (
                                        <div className="px-4 py-4 text-sm text-muted-foreground">
                                            {t('signatory.empty', 'contracts')}
                                        </div>
                                    ) : (
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b text-left text-xs text-muted-foreground">
                                                    <th className="p-2 font-medium">{t('signatory.sign_order', 'contracts')}</th>
                                                    <th className="p-2 font-medium">{t('signatory.type', 'contracts')}</th>
                                                    <th className="p-2 font-medium">{t('signatory.name', 'contracts')}</th>
                                                    <th className="p-2 font-medium">{t('signatory.title', 'contracts')}</th>
                                                    <th className="p-2 font-medium">{t('signatory.required', 'contracts')}</th>
                                                    <th className="p-2 font-medium">{t('signatory.status', 'contracts')}</th>
                                                    <th className="p-2 font-medium">{t('signatory.signed_at', 'contracts')}</th>
                                                    {can.manage_signatures && contract.status !== 'executed' && (
                                                        <th className="p-2 font-medium">{t('signatory.actions', 'contracts')}</th>
                                                    )}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {signatories.map((sig) => (
                                                    <tr key={sig.id} className="border-b last:border-b-0">
                                                        <td className="p-2">{sig.sign_order}</td>
                                                        <td className="p-2">{t(`signatory.types.${sig.signatory_type}`, 'contracts')}</td>
                                                        <td className="p-2 font-medium">{sig.name}</td>
                                                        <td className="p-2 text-muted-foreground">{sig.title ?? '—'}</td>
                                                        <td className="p-2">{sig.is_required ? t('signatory.yes', 'contracts') : t('signatory.no', 'contracts')}</td>
                                                        <td className="p-2">
                                                            <Badge
                                                                variant="outline"
                                                                className={
                                                                    sig.status === 'signed'
                                                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                                                        : sig.status === 'declined'
                                                                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                                                                          : sig.status === 'skipped'
                                                                            ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                                                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                                                }
                                                            >
                                                                {t(`signatory.statuses.${sig.status}`, 'contracts')}
                                                            </Badge>
                                                        </td>
                                                        <td className="p-2 text-muted-foreground">
                                                            {sig.signed_at ? new Date(sig.signed_at).toLocaleString() : '—'}
                                                        </td>
                                                        {can.manage_signatures && contract.status !== 'executed' && (
                                                            <td className="p-2">
                                                                {sig.status === 'pending' && (
                                                                    <div className="flex flex-wrap gap-1">
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            onClick={() =>
                                                                                router.post(
                                                                                    route('contracts.signatories.mark-status', {
                                                                                        contract: contract.id,
                                                                                        signatory: sig.id,
                                                                                    }),
                                                                                    { status: 'signed' },
                                                                                    { preserveScroll: true }
                                                                                )
                                                                            }
                                                                        >
                                                                            {t('signatory.mark_signed', 'contracts')}
                                                                        </Button>
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            onClick={() =>
                                                                                router.post(
                                                                                    route('contracts.signatories.mark-status', {
                                                                                        contract: contract.id,
                                                                                        signatory: sig.id,
                                                                                    }),
                                                                                    { status: 'declined' },
                                                                                    { preserveScroll: true }
                                                                                )
                                                                            }
                                                                        >
                                                                            {t('signatory.mark_declined', 'contracts')}
                                                                        </Button>
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            onClick={() =>
                                                                                router.post(
                                                                                    route('contracts.signatories.mark-status', {
                                                                                        contract: contract.id,
                                                                                        signatory: sig.id,
                                                                                    }),
                                                                                    { status: 'skipped' },
                                                                                    { preserveScroll: true }
                                                                                )
                                                                            }
                                                                        >
                                                                            {t('signatory.mark_skipped', 'contracts')}
                                                                        </Button>
                                                                    </div>
                                                                )}
                                                            </td>
                                                        )}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </div>
                            <div className="rounded-md border">
                                <div className="border-b bg-muted/60 px-4 py-2 text-xs font-medium">
                                    {t('signatory.history_title', 'contracts')}
                                </div>
                                <div className="max-h-48 overflow-y-auto text-xs">
                                    {signature_events.length === 0 ? (
                                        <div className="px-4 py-3 text-muted-foreground">{t('signatory.history_empty', 'contracts')}</div>
                                    ) : (
                                        signature_events.map((ev) => (
                                            <div key={ev.id} className="border-b px-4 py-2 last:border-b-0">
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <span className="font-medium">{t(`signatory.event_types.${ev.event_type}`, 'contracts')}</span>
                                                    <span className="text-[11px] text-muted-foreground">
                                                        {ev.created_at ? new Date(ev.created_at).toLocaleString() : ''}
                                                    </span>
                                                </div>
                                                {(ev.old_status || ev.new_status) && (
                                                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                                                        {ev.old_status && ev.new_status
                                                            ? `${ev.old_status} → ${ev.new_status}`
                                                            : ev.new_status ?? ev.old_status}
                                                    </p>
                                                )}
                                                {ev.signatory && (
                                                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                                                        {ev.signatory.name} ({t(`signatory.types.${ev.signatory.signatory_type}`, 'contracts')})
                                                    </p>
                                                )}
                                                {ev.changed_by && (
                                                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                                                        {t('signatory.changed_by', 'contracts', { name: ev.changed_by.name })}
                                                    </p>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                            {can.manage_signatures &&
                                contract.status === 'fully_signed' &&
                                !execution.executed_at && (
                                    <form
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            router.post(route('contracts.mark-executed', contract.id), {}, { preserveScroll: true });
                                        }}
                                        className="flex flex-wrap items-center gap-2"
                                    >
                                        <Button type="submit" size="sm">
                                            {t('execution.mark_button', 'contracts')}
                                        </Button>
                                    </form>
                                )}
                        </CardContent>
                    </Card>
                )}

                {contract.status === 'executed' && (
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('administration.title', 'contracts')}</CardTitle>
                            <CardDescription>
                                {t('administration.description', 'contracts')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
                                <div>
                                    <p className="text-xs text-muted-foreground">{t('administration.status_label', 'contracts')}</p>
                                    <p className="mt-1">
                                        <Badge variant="outline" className={administration.status === 'initialized' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}>
                                            {t(`administration.statuses.${administration.status}`, 'contracts')}
                                        </Badge>
                                    </p>
                                </div>
                                {administration.initialized_at && (
                                    <>
                                        <div>
                                            <p className="text-xs text-muted-foreground">{t('administration.initialized_at', 'contracts')}</p>
                                            <p className="mt-1 font-medium">
                                                {new Date(administration.initialized_at).toLocaleString()}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">{t('administration.initialized_by', 'contracts')}</p>
                                            <p className="mt-1 font-medium">{administration.initialized_by?.name ?? '—'}</p>
                                        </div>
                                    </>
                                )}
                                {administration.effective_date && (
                                    <div>
                                        <p className="text-xs text-muted-foreground">{t('administration.effective_date', 'contracts')}</p>
                                        <p className="mt-1 font-medium">{new Date(administration.effective_date).toLocaleDateString()}</p>
                                    </div>
                                )}
                                {administration.commencement_date && (
                                    <div>
                                        <p className="text-xs text-muted-foreground">{t('administration.commencement_date', 'contracts')}</p>
                                        <p className="mt-1 font-medium">{new Date(administration.commencement_date).toLocaleDateString()}</p>
                                    </div>
                                )}
                                {administration.completion_date_planned && (
                                    <div>
                                        <p className="text-xs text-muted-foreground">{t('administration.completion_date_planned', 'contracts')}</p>
                                        <p className="mt-1 font-medium">{new Date(administration.completion_date_planned).toLocaleDateString()}</p>
                                    </div>
                                )}
                                {administration.contract_value_final != null && (
                                    <div>
                                        <p className="text-xs text-muted-foreground">{t('administration.contract_value_final', 'contracts')}</p>
                                        <p className="mt-1 font-medium">
                                            {administration.contract_value_final} {administration.currency_final ?? ''}
                                        </p>
                                    </div>
                                )}
                                {administration.supplier_reference_no && (
                                    <div>
                                        <p className="text-xs text-muted-foreground">{t('administration.supplier_reference_no', 'contracts')}</p>
                                        <p className="mt-1 font-medium">{administration.supplier_reference_no}</p>
                                    </div>
                                )}
                            </div>
                            {administration.administration_notes && (
                                <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm">
                                    <p className="text-xs text-muted-foreground">{t('administration.administration_notes', 'contracts')}</p>
                                    <p className="mt-1">{administration.administration_notes}</p>
                                </div>
                            )}
                            {can.initialize_administration && (
                                <div className="rounded-md border border-dashed p-4">
                                    {administration.status === 'initialized' ? (
                                        <>
                                            <p className="mb-2 text-sm font-medium">{t('administration.create_new_baseline_version', 'contracts')}</p>
                                            <p className="mb-3 text-xs text-muted-foreground">{t('administration.baseline_already_initialized', 'contracts')}</p>
                                            <InitializeAdministrationForm
                                                contractId={contract.id}
                                                contractCurrency={contract.currency ?? ''}
                                                contractValue={contract.contract_value ?? ''}
                                                alreadyInitialized
                                            />
                                        </>
                                    ) : (
                                        <>
                                            <p className="mb-2 text-sm font-medium">{t('administration.readiness_title', 'contracts')}</p>
                                            {administration.readiness.is_ready ? (
                                                <p className="mb-3 text-xs text-muted-foreground">{t('administration.ready_to_initialize', 'contracts')}</p>
                                            ) : (
                                                <>
                                                    <p className="mb-1 text-xs text-muted-foreground">{t('administration.blocking_issues', 'contracts')}</p>
                                                    <ul className="mb-3 list-disc pl-5 text-xs text-muted-foreground">
                                                        {administration.readiness.issues.map((issue) => (
                                                            <li key={issue}>{issue}</li>
                                                        ))}
                                                    </ul>
                                                </>
                                            )}
                                            {administration.readiness.is_ready && (
                                                <InitializeAdministrationForm
                                                    contractId={contract.id}
                                                    contractCurrency={contract.currency ?? ''}
                                                    contractValue={contract.contract_value ?? ''}
                                                    alreadyInitialized={false}
                                                />
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                            {administration.baseline_history.length > 0 && (
                                <div className="rounded-md border">
                                    <div className="border-b bg-muted/60 px-4 py-2 text-xs font-medium">
                                        {t('administration.baseline_history_title', 'contracts')}
                                    </div>
                                    <div className="max-h-48 overflow-y-auto text-xs">
                                        {administration.baseline_history.map((b) => (
                                            <div key={b.id} className="border-b px-4 py-2 last:border-b-0">
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <span className="font-medium">
                                                        {t('administration.baseline_version', 'contracts')} {b.baseline_version}
                                                    </span>
                                                    <span className="text-[11px] text-muted-foreground">
                                                        {b.prepared_at ? new Date(b.prepared_at).toLocaleString() : ''}
                                                        {b.prepared_by && ` · ${b.prepared_by.name}`}
                                                    </span>
                                                </div>
                                                <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                                                    {b.effective_date && <span>{t('administration.effective_date', 'contracts')}: {new Date(b.effective_date).toLocaleDateString()}</span>}
                                                    {b.commencement_date && <span>{t('administration.commencement_date', 'contracts')}: {new Date(b.commencement_date).toLocaleDateString()}</span>}
                                                    {b.completion_date_planned && <span>{t('administration.completion_date_planned', 'contracts')}: {new Date(b.completion_date_planned).toLocaleDateString()}</span>}
                                                    {b.contract_value_final != null && <span>{b.contract_value_final} {b.currency_final ?? ''}</span>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle>Review workflow</CardTitle>
                        <CardDescription>
                            Header-level review status and history for this contract draft.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 text-sm">
                            <div>
                                <p className="text-xs text-muted-foreground">Review status</p>
                                <p className="mt-1 flex items-center gap-2 font-medium">
                                    <Badge
                                        variant="outline"
                                        className={reviewStatusBadgeClass[review.status] ?? ''}
                                    >
                                        {labelize(review.status)}
                                    </Badge>
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Current stage</p>
                                <p className="mt-1 font-medium">
                                    {review.current_stage ? labelize(review.current_stage) : '—'}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Submitted for review at</p>
                                <p className="mt-1 font-medium">
                                    {review.submitted_for_review_at
                                        ? new Date(review.submitted_for_review_at).toLocaleString()
                                        : '—'}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Submitted by</p>
                                <p className="mt-1 font-medium">
                                    {review.submitted_for_review_by?.name ?? '—'}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Review completed at</p>
                                <p className="mt-1 font-medium">
                                    {review.review_completed_at
                                        ? new Date(review.review_completed_at).toLocaleString()
                                        : '—'}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Review completed by</p>
                                <p className="mt-1 font-medium">
                                    {review.review_completed_by?.name ?? '—'}
                                </p>
                            </div>
                            <div className="md:col-span-2 lg:col-span-4">
                                <p className="text-xs text-muted-foreground">Return reason</p>
                                <p className="mt-1 text-sm">
                                    {review.return_reason ?? '—'}
                                </p>
                            </div>
                            <div className="md:col-span-2 lg:col-span-4">
                                <p className="text-xs text-muted-foreground">Approval summary</p>
                                <p className="mt-1 text-sm">
                                    {review.approval_summary ?? '—'}
                                </p>
                            </div>
                        </div>
                        <div className="mt-4 rounded-md border">
                            <div className="border-b bg-muted/60 px-4 py-2 text-xs font-medium">
                                Review history
                            </div>
                            <div className="max-h-48 overflow-y-auto text-xs">
                                {review.history.length === 0 && (
                                    <div className="px-4 py-4 text-muted-foreground">
                                        No review decisions have been recorded yet.
                                    </div>
                                )}
                                {review.history.map((item) => (
                                    <div
                                        key={item.id}
                                        className="border-b px-4 py-2 last:border-b-0"
                                    >
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Badge
                                                    variant="outline"
                                                    className={reviewStatusBadgeClass[item.to_status] ?? ''}
                                                >
                                                    {labelize(item.to_status)}
                                                </Badge>
                                                <span>
                                                    {labelize(item.stage)}
                                                    {' · '}
                                                    {labelize(item.decision)}
                                                </span>
                                            </div>
                                            <span className="text-[11px] text-muted-foreground">
                                                {item.decided_at
                                                    ? new Date(item.decided_at).toLocaleString()
                                                    : ''}
                                            </span>
                                        </div>
                                        <div className="mt-1 text-[11px] text-muted-foreground">
                                            {item.notes}
                                        </div>
                                        <div className="mt-0.5 text-[11px] text-muted-foreground">
                                            {item.decided_by
                                                ? `Decided by ${item.decided_by}`
                                                : ''}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Source summary</CardTitle>
                        <CardDescription>RFQ, project, package, supplier and template used for this draft.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
                        <div>
                            <p className="text-xs text-muted-foreground">RFQ</p>
                            <p className="mt-1 font-medium">
                                {source.rfq ? (
                                    <Link href={route('rfqs.show', source.rfq.id)} className="hover:underline">
                                        {source.rfq.rfq_number}
                                    </Link>
                                ) : (
                                    '—'
                                )}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Project</p>
                            <p className="mt-1 font-medium">{source.project?.name ?? '—'}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Procurement package</p>
                            <p className="mt-1 font-medium">
                                {source.package ? `${source.package.package_no ?? ''} ${source.package.name}` : '—'}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Supplier</p>
                            <p className="mt-1 font-medium">{source.supplier?.legal_name_en ?? '—'}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Template</p>
                            <p className="mt-1 font-medium">
                                {source.template ? `${source.template.code} — ${source.template.name_en}` : '—'}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Current Contract Value</CardTitle></CardHeader>
                        <CardContent>
                            <p className="text-xl font-semibold tabular-nums">{contract.currency} {financials.current_contract_value.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Approved Invoices</CardTitle></CardHeader>
                        <CardContent>
                            <p className="text-xl font-semibold tabular-nums">{contract.currency} {financials.approved_invoice_total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Paid Invoices</CardTitle></CardHeader>
                        <CardContent>
                            <p className="text-xl font-semibold tabular-nums">{contract.currency} {financials.paid_invoice_total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Outstanding Balance</CardTitle></CardHeader>
                        <CardContent>
                            <p className="text-xl font-semibold tabular-nums">{contract.currency} {financials.outstanding_balance.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('variations.title', 'contracts')}</CardTitle>
                        <CardDescription>{t('variations.description', 'contracts')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {variation_summary.variation_count_total > 0 && (
                            <div className="grid gap-2 rounded-md border p-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                                <div>
                                    <p className="text-muted-foreground">{t('variations.summary_title', 'contracts')}</p>
                                    <p className="font-medium">{(variation_summary.variation_count_total ?? 0)} total / {(variation_summary.variation_count_approved ?? 0)} approved</p>
                                </div>
                                {variation_summary.variation_total_approved != null && (
                                    <div>
                                        <p className="text-muted-foreground">{t('variations.approved_value', 'contracts')}</p>
                                        <p className="font-medium tabular-nums">{Number(variation_summary.variation_total_approved).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                                    </div>
                                )}
                                {(variation_summary.variation_days_total_approved ?? 0) > 0 && (
                                    <div>
                                        <p className="text-muted-foreground">{t('variations.approved_days', 'contracts')}</p>
                                        <p className="font-medium tabular-nums">{variation_summary.variation_days_total_approved}</p>
                                    </div>
                                )}
                            </div>
                        )}
                        {!variation_eligibility.is_ready && variation_eligibility.issues.length > 0 && (
                            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950/30">
                                <p className="font-medium text-amber-800 dark:text-amber-200">{t('variations.not_eligible', 'contracts')}</p>
                                <ul className="mt-1 list-disc pl-5 text-amber-700 dark:text-amber-300">
                                    {variation_eligibility.issues.map((issue) => (
                                        <li key={issue}>{issue}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {can.create_variation && variation_eligibility.is_ready && (
                            <form onSubmit={handleCreateVariation} className="grid gap-3 rounded-md border p-3 md:grid-cols-2">
                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="variation_title">{t('fields.title_en.label', 'contracts')} *</Label>
                                    <Input
                                        id="variation_title"
                                        value={variationForm.data.title}
                                        onChange={(event) => variationForm.setData('title', event.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('variations.type', 'contracts')} *</Label>
                                    <Select value={variationForm.data.variation_type} onValueChange={(value) => variationForm.setData('variation_type', value)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="commercial">{t('variations.types.commercial', 'contracts')}</SelectItem>
                                            <SelectItem value="time">{t('variations.types.time', 'contracts')}</SelectItem>
                                            <SelectItem value="commercial_time">{t('variations.types.commercial_time', 'contracts')}</SelectItem>
                                            <SelectItem value="administrative">{t('variations.types.administrative', 'contracts')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="variation_reason">{t('variations.reason', 'contracts')}</Label>
                                    <Input
                                        id="variation_reason"
                                        value={variationForm.data.reason}
                                        onChange={(event) => variationForm.setData('reason', event.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="variation_commercial">{t('variations.commercial_delta', 'contracts')}</Label>
                                    <Input
                                        id="variation_commercial"
                                        type="number"
                                        step="0.01"
                                        value={variationForm.data.commercial_delta}
                                        onChange={(event) => variationForm.setData('commercial_delta', event.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="variation_currency">Currency</Label>
                                    <Input
                                        id="variation_currency"
                                        value={variationForm.data.currency}
                                        onChange={(event) => variationForm.setData('currency', event.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="variation_days">{t('variations.time_delta_days', 'contracts')}</Label>
                                    <Input
                                        id="variation_days"
                                        type="number"
                                        min={0}
                                        value={variationForm.data.time_delta_days}
                                        onChange={(event) => variationForm.setData('time_delta_days', event.target.value)}
                                    />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="variation_description">{t('fields.description.label', 'contracts')}</Label>
                                    <textarea
                                        id="variation_description"
                                        className="flex min-h-[70px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                                        value={variationForm.data.description}
                                        onChange={(event) => variationForm.setData('description', event.target.value)}
                                    />
                                </div>
                                <div className="md:col-span-2 flex justify-end">
                                    <Button type="submit" disabled={variationForm.processing}>{t('variations.create', 'contracts')}</Button>
                                </div>
                            </form>
                        )}

                        <div className="overflow-x-auto rounded-md border">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/80">
                                    <tr className="border-b border-border">
                                        <th className="px-4 py-3 text-left font-medium">{t('variations.variation_no', 'contracts')}</th>
                                        <th className="px-4 py-3 text-left font-medium">{t('fields.title_en.label', 'contracts')}</th>
                                        <th className="px-4 py-3 text-left font-medium">{t('variations.type', 'contracts')}</th>
                                        <th className="px-4 py-3 text-right font-medium">{t('variations.commercial_delta', 'contracts')}</th>
                                        <th className="px-4 py-3 text-right font-medium">{t('variations.time_delta_days', 'contracts')}</th>
                                        <th className="px-4 py-3 text-left font-medium">Status</th>
                                        <th className="px-4 py-3 text-right font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {variations.map((variation) => (
                                        <tr key={variation.id} className="border-b border-border hover:bg-muted/30">
                                            <td className="px-4 py-3 font-mono">{variation.variation_no}</td>
                                            <td className="px-4 py-3">{variation.title}</td>
                                            <td className="px-4 py-3">{t(`variations.types.${variation.variation_type}`, 'contracts') || labelize(variation.variation_type)}</td>
                                            <td className="px-4 py-3 text-right tabular-nums">
                                                {variation.commercial_delta != null ? Number(variation.commercial_delta).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}
                                                {variation.currency ? ` ${variation.currency}` : ''}
                                            </td>
                                            <td className="px-4 py-3 text-right tabular-nums">{variation.time_delta_days ?? '—'}</td>
                                            <td className="px-4 py-3">
                                                <Badge variant="outline" className={genericStatusBadgeClass[variation.status] ?? ''}>
                                                    {t(`variations.statuses.${variation.status}`, 'contracts') || labelize(variation.status)}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex flex-wrap justify-end gap-2">
                                                    {variation.status === 'draft' && canSubmitVariation && (
                                                        <Button variant="outline" size="sm" onClick={() => router.post(route('contracts.variations.submit', [contract.id, variation.id]), {}, { preserveScroll: true })}>
                                                            {t('variations.submit', 'contracts')}
                                                        </Button>
                                                    )}
                                                    {variation.status === 'submitted' && canApproveVariation && (
                                                        <>
                                                            <Button variant="outline" size="sm" onClick={() => router.post(route('contracts.variations.approve', [contract.id, variation.id]), {}, { preserveScroll: true })}>
                                                                {t('variations.approve', 'contracts')}
                                                            </Button>
                                                            <Button variant="destructive" size="sm" onClick={() => router.post(route('contracts.variations.reject', [contract.id, variation.id]), {}, { preserveScroll: true })}>
                                                                {t('variations.reject', 'contracts')}
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {variations.length === 0 && (
                                <div className="px-4 py-6 text-center text-sm text-muted-foreground">{t('variations.empty', 'contracts')}</div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('invoices.title', 'contracts')}</CardTitle>
                        <CardDescription>{t('invoices.description', 'contracts')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {invoice_summary.invoice_count_total > 0 && (
                            <div className="grid gap-3 rounded-md border p-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                                <p className="text-muted-foreground">{t('invoices.summary_title', 'contracts')}</p>
                                <p className="font-medium">{invoice_summary.invoice_count_total} total / {invoice_summary.invoice_count_approved} approved / {invoice_summary.invoice_count_paid} paid</p>
                                {invoice_summary.invoice_total_submitted != null && (
                                    <>
                                        <p className="text-muted-foreground">{t('invoices.submitted_total', 'contracts')}</p>
                                        <p className="font-medium tabular-nums">{Number(invoice_summary.invoice_total_submitted).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                                    </>
                                )}
                                {invoice_summary.invoice_total_approved != null && (
                                    <>
                                        <p className="text-muted-foreground">{t('invoices.approved_total', 'contracts')}</p>
                                        <p className="font-medium tabular-nums">{Number(invoice_summary.invoice_total_approved).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                                    </>
                                )}
                                {invoice_summary.invoice_total_paid != null && (
                                    <>
                                        <p className="text-muted-foreground">{t('invoices.paid_total', 'contracts')}</p>
                                        <p className="font-medium tabular-nums">{Number(invoice_summary.invoice_total_paid).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                                    </>
                                )}
                            </div>
                        )}

                        {!invoice_eligibility.is_ready && invoice_eligibility.issues.length > 0 && (
                            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950/30">
                                <p className="font-medium text-amber-800 dark:text-amber-200">{t('invoices.not_eligible', 'contracts')}</p>
                                <ul className="mt-1 list-disc pl-5 text-amber-700 dark:text-amber-300">
                                    {invoice_eligibility.issues.map((issue) => (
                                        <li key={issue}>{issue}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {canManageInvoices && invoice_eligibility.is_ready && (
                            <form onSubmit={handleCreateInvoice} className="grid gap-3 rounded-md border p-3 md:grid-cols-2 lg:grid-cols-3">
                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="invoice_title">{t('invoices.title_label', 'contracts')} *</Label>
                                    <Input id="invoice_title" value={invoiceForm.data.title} onChange={(e) => invoiceForm.setData('title', e.target.value)} required />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('invoices.invoice_type', 'contracts')} *</Label>
                                    <Select value={invoiceForm.data.invoice_type} onValueChange={(v) => invoiceForm.setData('invoice_type', v)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="advance">{t('invoices.types.advance', 'contracts')}</SelectItem>
                                            <SelectItem value="interim">{t('invoices.types.interim', 'contracts')}</SelectItem>
                                            <SelectItem value="final">{t('invoices.types.final', 'contracts')}</SelectItem>
                                            <SelectItem value="administrative">{t('invoices.types.administrative', 'contracts')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="invoice_amount">{t('invoices.amount', 'contracts')} *</Label>
                                    <Input id="invoice_amount" type="number" step="0.01" min="0" value={invoiceForm.data.amount} onChange={(e) => invoiceForm.setData('amount', e.target.value)} required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="invoice_currency">{t('invoices.currency', 'contracts')} *</Label>
                                    <Input id="invoice_currency" value={invoiceForm.data.currency} onChange={(e) => invoiceForm.setData('currency', e.target.value)} required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="invoice_period_from">{t('invoices.period_from', 'contracts')}</Label>
                                    <Input id="invoice_period_from" type="date" value={formatDateForInput(invoiceForm.data.period_from)} onChange={(e) => invoiceForm.setData('period_from', e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="invoice_period_to">{t('invoices.period_to', 'contracts')}</Label>
                                    <Input id="invoice_period_to" type="date" value={formatDateForInput(invoiceForm.data.period_to)} onChange={(e) => invoiceForm.setData('period_to', e.target.value)} />
                                </div>
                                <div className="space-y-2 md:col-span-2 lg:col-span-3">
                                    <Label htmlFor="invoice_description">{t('invoices.description_label', 'contracts')}</Label>
                                    <textarea id="invoice_description" className="flex min-h-[70px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" value={invoiceForm.data.description} onChange={(e) => invoiceForm.setData('description', e.target.value)} />
                                </div>
                                <div className="flex justify-end md:col-span-2 lg:col-span-3">
                                    <Button type="submit" disabled={invoiceForm.processing}>{t('invoices.create', 'contracts')}</Button>
                                </div>
                            </form>
                        )}

                        <div className="overflow-x-auto rounded-md border">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/80">
                                    <tr className="border-b border-border">
                                        <th className="px-4 py-3 text-left font-medium">{t('invoices.invoice_no', 'contracts')}</th>
                                        <th className="px-4 py-3 text-left font-medium">{t('invoices.title_label', 'contracts')}</th>
                                        <th className="px-4 py-3 text-left font-medium">{t('invoices.invoice_type', 'contracts')}</th>
                                        <th className="px-4 py-3 text-right font-medium">{t('invoices.amount', 'contracts')}</th>
                                        <th className="px-4 py-3 text-left font-medium">{t('invoices.currency', 'contracts')}</th>
                                        <th className="px-4 py-3 text-left font-medium">{t('invoices.period_from', 'contracts')} / {t('invoices.period_to', 'contracts')}</th>
                                        <th className="px-4 py-3 text-left font-medium">{t('invoices.status', 'contracts')}</th>
                                        <th className="px-4 py-3 text-right font-medium">{t('invoices.actions', 'contracts')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {invoices.map((invoice) => (
                                        <tr key={invoice.id} className="border-b border-border hover:bg-muted/30">
                                            <td className="px-4 py-3 font-mono">{invoice.invoice_no}</td>
                                            <td className="px-4 py-3">{invoice.title}</td>
                                            <td className="px-4 py-3">{t(`invoices.types.${invoice.invoice_type}`, 'contracts') || labelize(invoice.invoice_type)}</td>
                                            <td className="px-4 py-3 text-right tabular-nums">
                                                {invoice.amount != null ? Number(invoice.amount).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}
                                                {invoice.currency ? ` ${invoice.currency}` : ''}
                                            </td>
                                            <td className="px-4 py-3">{invoice.currency ?? '—'}</td>
                                            <td className="px-4 py-3 text-xs text-muted-foreground">
                                                {invoice.period_from ? new Date(invoice.period_from).toLocaleDateString() : '—'} / {invoice.period_to ? new Date(invoice.period_to).toLocaleDateString() : '—'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge variant="outline" className={genericStatusBadgeClass[invoice.status] ?? ''}>{t(`invoices.statuses.${invoice.status}`, 'contracts') || labelize(invoice.status)}</Badge>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex flex-wrap justify-end gap-2">
                                                    {invoice.status === 'draft' && canManageInvoices && (
                                                        <Button variant="outline" size="sm" onClick={() => router.post(route('contracts.invoices.submit', [contract.id, invoice.id]), {}, { preserveScroll: true })}>
                                                            {t('invoices.submit', 'contracts')}
                                                        </Button>
                                                    )}
                                                    {invoice.status === 'submitted' && canApproveInvoice && (
                                                        <>
                                                            <Button variant="outline" size="sm" onClick={() => router.post(route('contracts.invoices.approve', [contract.id, invoice.id]), {}, { preserveScroll: true })}>
                                                                {t('invoices.approve', 'contracts')}
                                                            </Button>
                                                            <Button variant="destructive" size="sm" onClick={() => setInvoiceToReject(invoice)}>
                                                                {t('invoices.reject', 'contracts')}
                                                            </Button>
                                                        </>
                                                    )}
                                                    {invoice.status === 'approved' && canPayInvoice && (
                                                        <Button variant="outline" size="sm" onClick={() => router.post(route('contracts.invoices.mark-paid', [contract.id, invoice.id]), {}, { preserveScroll: true })}>
                                                            {t('invoices.mark_paid', 'contracts')}
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {invoices.length === 0 && (
                                <div className="px-4 py-6 text-center text-sm text-muted-foreground">{t('invoices.empty', 'contracts')}</div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('closeout.title', 'contracts')}</CardTitle>
                        <CardDescription>{t('closeout.description', 'contracts')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-3 rounded-md border p-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                            <p className="text-muted-foreground">{t('closeout.status_label', 'contracts')}</p>
                            <p className="font-medium">{t(`closeout.statuses.${closeout_summary.closeout_status}`, 'contracts') || labelize(closeout_summary.closeout_status)}</p>
                            {closeout_summary.closeout_initialized_at && (
                                <>
                                    <p className="text-muted-foreground">{t('closeout.initialized_at', 'contracts')}</p>
                                    <p className="font-medium">{new Date(closeout_summary.closeout_initialized_at).toLocaleString()} {closeout_summary.closeout_initialized_by?.name ? `(${closeout_summary.closeout_initialized_by.name})` : ''}</p>
                                </>
                            )}
                            {closeout_summary.closeout_completed_at && (
                                <>
                                    <p className="text-muted-foreground">{t('closeout.completed_at', 'contracts')}</p>
                                    <p className="font-medium">{new Date(closeout_summary.closeout_completed_at).toLocaleString()} {closeout_summary.closeout_completed_by?.name ? `(${closeout_summary.closeout_completed_by.name})` : ''}</p>
                                </>
                            )}
                            {closeout_summary.practical_completion_at && (
                                <>
                                    <p className="text-muted-foreground">{t('closeout.practical_completion_at', 'contracts')}</p>
                                    <p className="font-medium">{new Date(closeout_summary.practical_completion_at).toLocaleDateString()}</p>
                                </>
                            )}
                            {closeout_summary.final_completion_at && (
                                <>
                                    <p className="text-muted-foreground">{t('closeout.final_completion_at', 'contracts')}</p>
                                    <p className="font-medium">{new Date(closeout_summary.final_completion_at).toLocaleDateString()}</p>
                                </>
                            )}
                            {closeout_summary.closeout_notes && (
                                <>
                                    <p className="text-muted-foreground">{t('closeout.closeout_notes', 'contracts')}</p>
                                    <p className="font-medium whitespace-pre-wrap">{closeout_summary.closeout_notes}</p>
                                </>
                            )}
                        </div>

                        {!closeout_readiness.is_ready && closeout_readiness.issues.length > 0 && (
                            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950/30">
                                <p className="font-medium text-amber-800 dark:text-amber-200">{t('closeout.readiness_title', 'contracts')}</p>
                                <ul className="mt-1 list-disc pl-5 text-amber-700 dark:text-amber-300">
                                    {closeout_readiness.issues.map((issue) => (
                                        <li key={issue}>{issue}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {can.initialize_closeout && closeout_readiness.is_ready && (
                            <form onSubmit={handleInitializeCloseout} className="grid gap-3 rounded-md border p-3 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="closeout_practical">{t('closeout.practical_completion_at', 'contracts')}</Label>
                                    <Input id="closeout_practical" type="date" value={formatDateForInput(closeoutForm.data.practical_completion_at)} onChange={(e) => closeoutForm.setData('practical_completion_at', e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="closeout_final">{t('closeout.final_completion_at', 'contracts')}</Label>
                                    <Input id="closeout_final" type="date" value={formatDateForInput(closeoutForm.data.final_completion_at)} onChange={(e) => closeoutForm.setData('final_completion_at', e.target.value)} />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="closeout_notes">{t('closeout.closeout_notes', 'contracts')}</Label>
                                    <textarea id="closeout_notes" className="flex min-h-[70px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" value={closeoutForm.data.closeout_notes} onChange={(e) => closeoutForm.setData('closeout_notes', e.target.value)} />
                                </div>
                                <div className="md:col-span-2 flex justify-end">
                                    <Button type="submit" disabled={closeoutForm.processing}>{t('closeout.initialize', 'contracts')}</Button>
                                </div>
                            </form>
                        )}

                        {can.complete_closeout && (
                            <div className="flex justify-end">
                                <Button variant="default" onClick={() => router.post(route('contracts.closeout.complete', contract.id), {}, { preserveScroll: true })}>
                                    {t('closeout.complete', 'contracts')}
                                </Button>
                            </div>
                        )}

                        {closeout_history.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-muted-foreground">{t('closeout.history_title', 'contracts')}</p>
                                <div className="space-y-2 rounded-md border p-3">
                                    {closeout_history.map((r) => (
                                        <div key={r.id} className="flex flex-wrap items-start justify-between gap-2 border-b border-border pb-2 last:border-0 last:pb-0">
                                            <div>
                                                <Badge variant="outline" className="text-xs">{t(`closeout.statuses.${r.closeout_status}`, 'contracts') || labelize(r.closeout_status)}</Badge>
                                                {r.prepared_at && <span className="ml-2 text-xs text-muted-foreground">{new Date(r.prepared_at).toLocaleString()}</span>}
                                                {r.prepared_by?.name && <span className="ml-2 text-xs text-muted-foreground">— {r.prepared_by.name}</span>}
                                            </div>
                                            {(r.practical_completion_at || r.final_completion_at) && (
                                                <span className="text-xs text-muted-foreground">
                                                    {r.practical_completion_at && new Date(r.practical_completion_at).toLocaleDateString()}
                                                    {r.practical_completion_at && r.final_completion_at && ' / '}
                                                    {r.final_completion_at && new Date(r.final_completion_at).toLocaleDateString()}
                                                </span>
                                            )}
                                            {r.closeout_notes && <p className="w-full mt-1 text-xs text-muted-foreground whitespace-pre-wrap">{r.closeout_notes}</p>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('defects.warranty_title', 'contracts')}</CardTitle>
                        <CardDescription>{t('defects.warranty_description', 'contracts')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {(warranty_summary.warranty_initialized || warranty_summary.defects_liability_start_at || warranty_summary.defects_liability_end_at) && (
                            <div className="grid gap-3 rounded-md border p-3 text-sm sm:grid-cols-2">
                                <p className="text-muted-foreground">{t('defects.dlp_start', 'contracts')}</p>
                                <p className="font-medium">{warranty_summary.defects_liability_start_at ? new Date(warranty_summary.defects_liability_start_at).toLocaleDateString() : '—'}</p>
                                <p className="text-muted-foreground">{t('defects.dlp_end', 'contracts')}</p>
                                <p className="font-medium">{warranty_summary.defects_liability_end_at ? new Date(warranty_summary.defects_liability_end_at).toLocaleDateString() : '—'}</p>
                                <p className="text-muted-foreground">{t('defects.warranty_status', 'contracts')}</p>
                                <p className="font-medium">{t(`defects.warranty_statuses.${warranty_summary.warranty_status}`, 'contracts') || labelize(warranty_summary.warranty_status)}</p>
                            </div>
                        )}

                        {!defect_eligibility.is_ready && defect_eligibility.issues.length > 0 && (
                            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950/30">
                                <p className="font-medium text-amber-800 dark:text-amber-200">{t('defects.not_eligible', 'contracts')}</p>
                                <ul className="mt-1 list-disc pl-5 text-amber-700 dark:text-amber-300">
                                    {defect_eligibility.issues.map((issue) => (
                                        <li key={issue}>{issue}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {can.initialize_warranty && defect_eligibility.is_ready && !warranty_summary.warranty_initialized && (
                            <form onSubmit={handleInitializeWarranty} className="grid gap-3 rounded-md border p-3 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="warranty_start">{t('defects.dlp_start', 'contracts')}</Label>
                                    <Input id="warranty_start" type="date" value={formatDateForInput(warrantyForm.data.defects_liability_start_at)} onChange={(e) => warrantyForm.setData('defects_liability_start_at', e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="warranty_end">{t('defects.dlp_end', 'contracts')}</Label>
                                    <Input id="warranty_end" type="date" value={formatDateForInput(warrantyForm.data.defects_liability_end_at)} onChange={(e) => warrantyForm.setData('defects_liability_end_at', e.target.value)} />
                                </div>
                                <div className="md:col-span-2 flex justify-end">
                                    <Button type="submit" disabled={warrantyForm.processing}>{t('defects.initialize_warranty', 'contracts')}</Button>
                                </div>
                            </form>
                        )}

                        {can.manage_defects && defect_eligibility.is_ready && (
                            <form onSubmit={handleCreateDefect} className="grid gap-3 rounded-md border p-3 md:grid-cols-2">
                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="defect_title">{t('defects.defect_title', 'contracts')} *</Label>
                                    <Input id="defect_title" value={defectForm.data.title} onChange={(e) => defectForm.setData('title', e.target.value)} required />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="defect_description">{t('defects.description', 'contracts')}</Label>
                                    <textarea id="defect_description" className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" value={defectForm.data.description} onChange={(e) => defectForm.setData('description', e.target.value)} />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="defect_notes">{t('defects.notes', 'contracts')}</Label>
                                    <textarea id="defect_notes" className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" value={defectForm.data.notes} onChange={(e) => defectForm.setData('notes', e.target.value)} />
                                </div>
                                <div className="md:col-span-2 flex justify-end">
                                    <Button type="submit" disabled={defectForm.processing}>{t('defects.create_defect', 'contracts')}</Button>
                                </div>
                            </form>
                        )}

                        <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">{t('defects.register_title', 'contracts')}</p>
                            <div className="overflow-x-auto rounded-md border">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/80">
                                        <tr className="border-b border-border">
                                            <th className="px-4 py-3 text-left font-medium">{t('defects.reference_no', 'contracts')}</th>
                                            <th className="px-4 py-3 text-left font-medium">{t('defects.defect_title', 'contracts')}</th>
                                            <th className="px-4 py-3 text-left font-medium">{t('defects.status_label', 'contracts')}</th>
                                            <th className="px-4 py-3 text-left font-medium">{t('defects.reported_at', 'contracts')}</th>
                                            <th className="px-4 py-3 text-left font-medium">{t('defects.resolved_at', 'contracts')}</th>
                                            <th className="px-4 py-3 text-left font-medium">{t('defects.closed_at', 'contracts')}</th>
                                            <th className="px-4 py-3 text-right font-medium">{t('defects.actions', 'contracts')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {defect_items.map((d) => (
                                            <tr key={d.id} className="border-b border-border hover:bg-muted/30">
                                                <td className="px-4 py-3 font-mono">{d.reference_no}</td>
                                                <td className="px-4 py-3">{d.title}</td>
                                                <td className="px-4 py-3">
                                                    <Badge variant="outline" className={genericStatusBadgeClass[d.status] ?? ''}>{t(`defects.statuses.${d.status}`, 'contracts') || labelize(d.status)}</Badge>
                                                </td>
                                                <td className="px-4 py-3 text-xs">{d.reported_at ? new Date(d.reported_at).toLocaleDateString() : '—'}</td>
                                                <td className="px-4 py-3 text-xs">{d.resolved_at ? new Date(d.resolved_at).toLocaleDateString() : '—'}</td>
                                                <td className="px-4 py-3 text-xs">{d.closed_at ? new Date(d.closed_at).toLocaleDateString() : '—'}</td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex flex-wrap justify-end gap-2">
                                                        {d.status === 'open' && can.manage_defects && (
                                                            <>
                                                                <Button variant="outline" size="sm" onClick={() => router.post(route('contracts.defects.update-status', [contract.id, d.id]), { status: 'in_progress' }, { preserveScroll: true })}>{t('defects.statuses.in_progress', 'contracts')}</Button>
                                                                <Button variant="outline" size="sm" onClick={() => router.post(route('contracts.defects.update-status', [contract.id, d.id]), { status: 'resolved' }, { preserveScroll: true })}>{t('defects.statuses.resolved', 'contracts')}</Button>
                                                            </>
                                                        )}
                                                        {d.status === 'in_progress' && can.manage_defects && (
                                                            <Button variant="outline" size="sm" onClick={() => router.post(route('contracts.defects.update-status', [contract.id, d.id]), { status: 'resolved' }, { preserveScroll: true })}>{t('defects.statuses.resolved', 'contracts')}</Button>
                                                        )}
                                                        {d.status === 'resolved' && can.manage_defects && (
                                                            <Button variant="outline" size="sm" onClick={() => router.post(route('contracts.defects.update-status', [contract.id, d.id]), { status: 'closed' }, { preserveScroll: true })}>{t('defects.statuses.closed', 'contracts')}</Button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {defect_items.length === 0 && (
                                    <div className="px-4 py-6 text-center text-sm text-muted-foreground">{t('defects.empty', 'contracts')}</div>
                                )}
                            </div>
                            {defect_items.some((d) => d.events.length > 0) && (
                                <div className="space-y-2 rounded-md border p-3">
                                    <p className="text-xs font-medium text-muted-foreground">{t('defects.history_title', 'contracts')}</p>
                                    {defect_items.filter((d) => d.events.length > 0).map((d) => (
                                        <div key={d.id} className="text-xs">
                                            <p className="font-mono font-medium">{d.reference_no}</p>
                                            {d.events.map((e) => (
                                                <p key={e.id} className="pl-3 text-muted-foreground">
                                                    {e.old_status ?? '—'} → {e.new_status ?? '—'} {e.created_at ? new Date(e.created_at).toLocaleString() : ''} {e.changed_by?.name ? `(${e.changed_by.name})` : ''}
                                                </p>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('retention.title', 'contracts')}</CardTitle>
                        <CardDescription>{t('retention.description', 'contracts')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {(retention_summary.retention_total_held != null || retention_summary.retention_total_pending != null || retention_summary.retention_total_released != null) && (
                            <div className="grid gap-3 rounded-md border p-3 sm:grid-cols-3">
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground">{t('retention.held_total', 'contracts')}</p>
                                    <p className="text-lg font-semibold">{retention_summary.retention_total_held != null ? Number(retention_summary.retention_total_held).toLocaleString() : '0'}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground">{t('retention.pending_total', 'contracts')}</p>
                                    <p className="text-lg font-semibold">{retention_summary.retention_total_pending != null ? Number(retention_summary.retention_total_pending).toLocaleString() : '0'}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground">{t('retention.released_total', 'contracts')}</p>
                                    <p className="text-lg font-semibold">{retention_summary.retention_total_released != null ? Number(retention_summary.retention_total_released).toLocaleString() : '0'}</p>
                                </div>
                            </div>
                        )}
                        {!retention_eligibility.is_ready && retention_eligibility.issues.length > 0 && (
                            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                                <p className="font-medium">{t('retention.not_eligible', 'contracts')}</p>
                                <ul className="mt-1 list-inside list-disc">
                                    {retention_eligibility.issues.map((issue, i) => (
                                        <li key={i}>{issue}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {can.manage_retention && retention_eligibility.is_ready && (
                            <form onSubmit={handleCreateRetention} className="grid gap-3 rounded-md border p-3 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="retention_amount">{t('retention.amount', 'contracts')} *</Label>
                                    <Input id="retention_amount" type="number" step="0.01" min="0.01" value={retentionForm.data.amount} onChange={(e) => retentionForm.setData('amount', e.target.value)} required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="retention_currency">{t('retention.currency', 'contracts')} *</Label>
                                    <Input id="retention_currency" value={retentionForm.data.currency} onChange={(e) => retentionForm.setData('currency', e.target.value)} required />
                                </div>
                                <div className="space-y-2 sm:col-span-2">
                                    <Label htmlFor="retention_reason">{t('retention.reason', 'contracts')}</Label>
                                    <textarea id="retention_reason" className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" value={retentionForm.data.reason} onChange={(e) => retentionForm.setData('reason', e.target.value)} />
                                </div>
                                <div className="sm:col-span-2 flex justify-end">
                                    <Button type="submit" disabled={retentionForm.processing}>{t('retention.create_release', 'contracts')}</Button>
                                </div>
                            </form>
                        )}
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">{t('retention.register_title', 'contracts')}</p>
                            <div className="overflow-x-auto rounded-md border">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/80">
                                        <tr className="border-b border-border">
                                            <th className="px-4 py-3 text-left font-medium">{t('retention.release_no', 'contracts')}</th>
                                            <th className="px-4 py-3 text-left font-medium">{t('retention.status_label', 'contracts')}</th>
                                            <th className="px-4 py-3 text-left font-medium">{t('retention.amount', 'contracts')}</th>
                                            <th className="px-4 py-3 text-left font-medium">{t('retention.currency', 'contracts')}</th>
                                            <th className="px-4 py-3 text-left font-medium">{t('retention.submitted_at', 'contracts')}</th>
                                            <th className="px-4 py-3 text-left font-medium">{t('retention.approved_at', 'contracts')}</th>
                                            <th className="px-4 py-3 text-left font-medium">{t('retention.released_at', 'contracts')}</th>
                                            <th className="px-4 py-3 text-left font-medium">{t('retention.decision_notes', 'contracts')}</th>
                                            <th className="px-4 py-3 text-right font-medium">{t('retention.actions', 'contracts')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {isExecutionRegistersLoading ? (
                                            <tr>
                                                <td colSpan={9} className="px-4 py-6 text-center text-sm text-muted-foreground">
                                                    {t('execution_registers.loading', 'contracts')}
                                                </td>
                                            </tr>
                                        ) : (
                                            retention_releases_display.map((r) => (
                                                <tr key={r.id} className="border-b border-border hover:bg-muted/30">
                                                    <td className="px-4 py-3 font-mono">{r.release_no}</td>
                                                    <td className="px-4 py-3">
                                                        <Badge variant="outline" className={genericStatusBadgeClass[r.status] ?? ''}>{t(`retention.statuses.${r.status}`, 'contracts') || labelize(r.status)}</Badge>
                                                    </td>
                                                    <td className="px-4 py-3">{Number(r.amount).toLocaleString()}</td>
                                                    <td className="px-4 py-3">{r.currency}</td>
                                                    <td className="px-4 py-3 text-xs">{r.submitted_at ? new Date(r.submitted_at).toLocaleDateString() : '—'}</td>
                                                    <td className="px-4 py-3 text-xs">{r.approved_at ? new Date(r.approved_at).toLocaleDateString() : '—'}</td>
                                                    <td className="px-4 py-3 text-xs">{r.released_at ? new Date(r.released_at).toLocaleDateString() : '—'}</td>
                                                    <td className="px-4 py-3 max-w-[120px] truncate text-xs" title={r.decision_notes ?? undefined}>{r.decision_notes ?? '—'}</td>
                                                    <td className="px-4 py-3 text-right">
                                                        <div className="flex flex-wrap justify-end gap-2">
                                                            {r.status === 'pending' && can.manage_retention && (
                                                                <Button variant="outline" size="sm" onClick={() => router.post(route('contracts.retention.submit', [contract.id, r.id]), {}, { preserveScroll: true })}>{t('retention.submit', 'contracts')}</Button>
                                                            )}
                                                            {r.status === 'submitted' && can.manage_retention && (
                                                                <>
                                                                    <Button variant="outline" size="sm" onClick={() => router.post(route('contracts.retention.approve', [contract.id, r.id]), {}, { preserveScroll: true })}>{t('retention.approve', 'contracts')}</Button>
                                                                    <Button variant="outline" size="sm" onClick={() => router.post(route('contracts.retention.reject', [contract.id, r.id]), {}, { preserveScroll: true })}>{t('retention.reject', 'contracts')}</Button>
                                                                </>
                                                            )}
                                                            {r.status === 'approved' && can.manage_retention && (
                                                                <Button variant="outline" size="sm" onClick={() => router.post(route('contracts.retention.mark-released', [contract.id, r.id]), {}, { preserveScroll: true })}>{t('retention.mark_released', 'contracts')}</Button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                                {!isExecutionRegistersLoading && retention_releases_display.length === 0 && (
                                    <div className="px-4 py-6 text-center text-sm text-muted-foreground">{t('retention.empty', 'contracts')}</div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('claims.title', 'contracts')}</CardTitle>
                        <CardDescription>{t('claims.description', 'contracts')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {claims_summary.total > 0 && (
                            <div className="flex flex-wrap gap-4 rounded-md border p-3 text-sm">
                                <span><strong>{t('claims.summary_total', 'contracts')}:</strong> {claims_summary.total}</span>
                                {claims_summary.draft > 0 && <span>{t('claims.statuses.draft', 'contracts')}: {claims_summary.draft}</span>}
                                {claims_summary.submitted > 0 && <span>{t('claims.statuses.submitted', 'contracts')}: {claims_summary.submitted}</span>}
                                {claims_summary.under_review > 0 && <span>{t('claims.statuses.under_review', 'contracts')}: {claims_summary.under_review}</span>}
                                {claims_summary.resolved > 0 && <span>{t('claims.statuses.resolved', 'contracts')}: {claims_summary.resolved}</span>}
                                {claims_summary.rejected > 0 && <span>{t('claims.statuses.rejected', 'contracts')}: {claims_summary.rejected}</span>}
                            </div>
                        )}
                        {!claim_eligibility.is_ready && claim_eligibility.issues.length > 0 && (
                            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                                <p className="font-medium">{t('claims.not_eligible', 'contracts')}</p>
                                <ul className="mt-1 list-inside list-disc">{claim_eligibility.issues.map((issue, i) => (<li key={i}>{issue}</li>))}</ul>
                            </div>
                        )}
                        {can.manage_claims && claim_eligibility.is_ready && (
                            <form onSubmit={handleCreateClaim} className="grid gap-3 rounded-md border p-3 sm:grid-cols-2">
                                <div className="space-y-2 sm:col-span-2">
                                    <Label htmlFor="claim_title">{t('claims.title_label', 'contracts')} *</Label>
                                    <Input id="claim_title" value={claimForm.data.title} onChange={(e) => claimForm.setData('title', e.target.value)} required />
                                </div>
                                <div className="space-y-2 sm:col-span-2">
                                    <Label htmlFor="claim_description">{t('claims.description_label', 'contracts')}</Label>
                                    <textarea id="claim_description" className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" value={claimForm.data.description} onChange={(e) => claimForm.setData('description', e.target.value)} />
                                </div>
                                <div className="space-y-2 sm:col-span-2">
                                    <Label htmlFor="claim_notes">{t('claims.notes', 'contracts')}</Label>
                                    <textarea id="claim_notes" className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" value={claimForm.data.notes} onChange={(e) => claimForm.setData('notes', e.target.value)} />
                                </div>
                                <div className="sm:col-span-2 flex justify-end">
                                    <Button type="submit" disabled={claimForm.processing}>{t('claims.create', 'contracts')}</Button>
                                </div>
                            </form>
                        )}
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">{t('claims.register_title', 'contracts')}</p>
                            <div className="overflow-x-auto rounded-md border">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/80">
                                        <tr className="border-b border-border">
                                            <th className="px-4 py-3 text-left font-medium">{t('claims.claim_no', 'contracts')}</th>
                                            <th className="px-4 py-3 text-left font-medium">{t('claims.title_label', 'contracts')}</th>
                                            <th className="px-4 py-3 text-left font-medium">{t('claims.status_label', 'contracts')}</th>
                                            <th className="px-4 py-3 text-left font-medium">{t('claims.submitted_at', 'contracts')}</th>
                                            <th className="px-4 py-3 text-right font-medium">{t('claims.actions', 'contracts')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {isExecutionRegistersLoading ? (
                                            <tr>
                                                <td colSpan={5} className="px-4 py-6 text-center text-sm text-muted-foreground">
                                                    {t('execution_registers.loading', 'contracts')}
                                                </td>
                                            </tr>
                                        ) : (
                                            contract_claims_display.map((c) => (
                                                <tr key={c.id} className="border-b border-border hover:bg-muted/30">
                                                    <td className="px-4 py-3 font-mono">{c.claim_no}</td>
                                                    <td className="px-4 py-3">{c.title}</td>
                                                    <td className="px-4 py-3">
                                                        <Badge variant="outline" className={genericStatusBadgeClass[c.status] ?? ''}>{t(`claims.statuses.${c.status}`, 'contracts') || labelize(c.status)}</Badge>
                                                    </td>
                                                    <td className="px-4 py-3 text-xs">{c.submitted_at ? new Date(c.submitted_at).toLocaleDateString() : '—'}</td>
                                                    <td className="px-4 py-3 text-right">
                                                        <div className="flex flex-wrap justify-end gap-2">
                                                            {c.status === 'draft' && can.manage_claims && (
                                                                <Button variant="outline" size="sm" onClick={() => router.post(route('contracts.claims.submit', [contract.id, c.id]), {}, { preserveScroll: true })}>{t('claims.submit', 'contracts')}</Button>
                                                            )}
                                                            {c.status === 'submitted' && can.manage_claims && (
                                                                <>
                                                                    <Button variant="outline" size="sm" onClick={() => router.post(route('contracts.claims.review', [contract.id, c.id]), {}, { preserveScroll: true })}>{t('claims.under_review', 'contracts')}</Button>
                                                                    <Button variant="outline" size="sm" onClick={() => router.post(route('contracts.claims.reject', [contract.id, c.id]), {}, { preserveScroll: true })}>{t('claims.reject', 'contracts')}</Button>
                                                                </>
                                                            )}
                                                            {c.status === 'under_review' && can.manage_claims && (
                                                                <>
                                                                    <Button variant="outline" size="sm" onClick={() => router.post(route('contracts.claims.resolve', [contract.id, c.id]), {}, { preserveScroll: true })}>{t('claims.resolve', 'contracts')}</Button>
                                                                    <Button variant="outline" size="sm" onClick={() => router.post(route('contracts.claims.reject', [contract.id, c.id]), {}, { preserveScroll: true })}>{t('claims.reject', 'contracts')}</Button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                                {!isExecutionRegistersLoading && contract_claims_display.length === 0 && (
                                    <div className="px-4 py-6 text-center text-sm text-muted-foreground">{t('claims.empty', 'contracts')}</div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('notices.title', 'contracts')}</CardTitle>
                        <CardDescription>{t('notices.description', 'contracts')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {notices_summary.total > 0 && (
                            <div className="flex flex-wrap gap-4 rounded-md border p-3 text-sm">
                                <span><strong>{t('notices.summary_total', 'contracts')}:</strong> {notices_summary.total}</span>
                                {notices_summary.draft > 0 && <span>{t('notices.statuses.draft', 'contracts')}: {notices_summary.draft}</span>}
                                {notices_summary.issued > 0 && <span>{t('notices.statuses.issued', 'contracts')}: {notices_summary.issued}</span>}
                                {notices_summary.responded > 0 && <span>{t('notices.statuses.responded', 'contracts')}: {notices_summary.responded}</span>}
                                {notices_summary.closed > 0 && <span>{t('notices.statuses.closed', 'contracts')}: {notices_summary.closed}</span>}
                            </div>
                        )}
                        {!notice_eligibility.is_ready && notice_eligibility.issues.length > 0 && (
                            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                                <p className="font-medium">{t('notices.not_eligible', 'contracts')}</p>
                                <ul className="mt-1 list-inside list-disc">{notice_eligibility.issues.map((issue, i) => (<li key={i}>{issue}</li>))}</ul>
                            </div>
                        )}
                        {can.manage_notices && notice_eligibility.is_ready && (
                            <form onSubmit={handleCreateNotice} className="grid gap-3 rounded-md border p-3 sm:grid-cols-2">
                                <div className="space-y-2 sm:col-span-2">
                                    <Label htmlFor="notice_title">{t('notices.title_label', 'contracts')} *</Label>
                                    <Input id="notice_title" value={noticeForm.data.title} onChange={(e) => noticeForm.setData('title', e.target.value)} required />
                                </div>
                                <div className="space-y-2 sm:col-span-2">
                                    <Label htmlFor="notice_description">{t('notices.description_label', 'contracts')}</Label>
                                    <textarea id="notice_description" className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" value={noticeForm.data.description} onChange={(e) => noticeForm.setData('description', e.target.value)} />
                                </div>
                                <div className="space-y-2 sm:col-span-2">
                                    <Label htmlFor="notice_notes">{t('notices.notes', 'contracts')}</Label>
                                    <textarea id="notice_notes" className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" value={noticeForm.data.notes} onChange={(e) => noticeForm.setData('notes', e.target.value)} />
                                </div>
                                <div className="sm:col-span-2 flex justify-end">
                                    <Button type="submit" disabled={noticeForm.processing}>{t('notices.create', 'contracts')}</Button>
                                </div>
                            </form>
                        )}
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">{t('notices.register_title', 'contracts')}</p>
                            <div className="overflow-x-auto rounded-md border">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/80">
                                        <tr className="border-b border-border">
                                            <th className="px-4 py-3 text-left font-medium">{t('notices.notice_no', 'contracts')}</th>
                                            <th className="px-4 py-3 text-left font-medium">{t('notices.title_label', 'contracts')}</th>
                                            <th className="px-4 py-3 text-left font-medium">{t('notices.status_label', 'contracts')}</th>
                                            <th className="px-4 py-3 text-left font-medium">{t('notices.issued_at', 'contracts')}</th>
                                            <th className="px-4 py-3 text-right font-medium">{t('notices.actions', 'contracts')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {isExecutionRegistersLoading ? (
                                            <tr>
                                                <td colSpan={5} className="px-4 py-6 text-center text-sm text-muted-foreground">
                                                    {t('execution_registers.loading', 'contracts')}
                                                </td>
                                            </tr>
                                        ) : (
                                            contract_notices_display.map((n) => (
                                                <tr key={n.id} className="border-b border-border hover:bg-muted/30">
                                                    <td className="px-4 py-3 font-mono">{n.notice_no}</td>
                                                    <td className="px-4 py-3">{n.title}</td>
                                                    <td className="px-4 py-3">
                                                        <Badge variant="outline" className={genericStatusBadgeClass[n.status] ?? ''}>{t(`notices.statuses.${n.status}`, 'contracts') || labelize(n.status)}</Badge>
                                                    </td>
                                                    <td className="px-4 py-3 text-xs">{n.issued_at ? new Date(n.issued_at).toLocaleDateString() : '—'}</td>
                                                    <td className="px-4 py-3 text-right">
                                                        <div className="flex flex-wrap justify-end gap-2">
                                                            {n.status === 'draft' && can.manage_notices && (
                                                                <Button variant="outline" size="sm" onClick={() => router.post(route('contracts.notices.issue', [contract.id, n.id]), {}, { preserveScroll: true })}>{t('notices.issue', 'contracts')}</Button>
                                                            )}
                                                            {n.status === 'issued' && can.manage_notices && (
                                                                <>
                                                                    <Button variant="outline" size="sm" onClick={() => router.post(route('contracts.notices.respond', [contract.id, n.id]), {}, { preserveScroll: true })}>{t('notices.respond', 'contracts')}</Button>
                                                                    <Button variant="outline" size="sm" onClick={() => router.post(route('contracts.notices.close', [contract.id, n.id]), {}, { preserveScroll: true })}>{t('notices.close', 'contracts')}</Button>
                                                                </>
                                                            )}
                                                            {n.status === 'responded' && can.manage_notices && (
                                                                <Button variant="outline" size="sm" onClick={() => router.post(route('contracts.notices.close', [contract.id, n.id]), {}, { preserveScroll: true })}>{t('notices.close', 'contracts')}</Button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                                {!isExecutionRegistersLoading && contract_notices_display.length === 0 && (
                                    <div className="px-4 py-6 text-center text-sm text-muted-foreground">{t('notices.empty', 'contracts')}</div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('securities.title', 'contracts')}</CardTitle>
                        <CardDescription>{t('securities.description', 'contracts')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {securities_summary.total > 0 && (
                            <div className="flex flex-wrap gap-4 rounded-md border p-3 text-sm">
                                <span><strong>{t('securities.summary_total', 'contracts')}:</strong> {securities_summary.total}</span>
                                {securities_summary.active > 0 && <span>{t('securities.statuses.active', 'contracts')}: {securities_summary.active}</span>}
                                {securities_summary.expiring > 0 && <span>{t('securities.statuses.expiring', 'contracts')}: {securities_summary.expiring}</span>}
                                {securities_summary.expired > 0 && <span>{t('securities.statuses.expired', 'contracts')}: {securities_summary.expired}</span>}
                                {securities_summary.released > 0 && <span>{t('securities.statuses.released', 'contracts')}: {securities_summary.released}</span>}
                            </div>
                        )}
                        {!security_eligibility.is_ready && security_eligibility.issues.length > 0 && (
                            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                                <p className="font-medium">{t('securities.not_eligible', 'contracts')}</p>
                                <ul className="mt-1 list-inside list-disc">{security_eligibility.issues.map((issue, i) => (<li key={i}>{issue}</li>))}</ul>
                            </div>
                        )}
                        {can.manage_securities && security_eligibility.is_ready && (
                            <form onSubmit={handleCreateSecurity} className="grid gap-3 rounded-md border p-3 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="security_instrument_type">{t('securities.instrument_type', 'contracts')} *</Label>
                                    <Select value={securityForm.data.instrument_type} onValueChange={(v) => securityForm.setData('instrument_type', v)}>
                                        <SelectTrigger id="security_instrument_type"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {['performance_bond', 'advance_payment_guarantee', 'retention_bond', 'insurance'].map((type) => (
                                                <SelectItem key={type} value={type}>{t(`securities.types.${type}`, 'contracts')}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2 sm:col-span-2">
                                    <Label htmlFor="security_provider">{t('securities.provider_name', 'contracts')} *</Label>
                                    <Input id="security_provider" value={securityForm.data.provider_name} onChange={(e) => securityForm.setData('provider_name', e.target.value)} required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="security_reference">{t('securities.reference_no', 'contracts')} *</Label>
                                    <Input id="security_reference" value={securityForm.data.reference_no} onChange={(e) => securityForm.setData('reference_no', e.target.value)} required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="security_amount">{t('securities.amount', 'contracts')}</Label>
                                    <Input id="security_amount" type="number" step="0.01" min="0" value={securityForm.data.amount} onChange={(e) => securityForm.setData('amount', e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="security_currency">{t('securities.currency', 'contracts')}</Label>
                                    <Input id="security_currency" value={securityForm.data.currency} onChange={(e) => securityForm.setData('currency', e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="security_issued_at">{t('securities.issued_at', 'contracts')}</Label>
                                    <Input id="security_issued_at" type="date" value={formatDateForInput(securityForm.data.issued_at)} onChange={(e) => securityForm.setData('issued_at', e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="security_expires_at">{t('securities.expires_at', 'contracts')}</Label>
                                    <Input id="security_expires_at" type="date" value={formatDateForInput(securityForm.data.expires_at)} onChange={(e) => securityForm.setData('expires_at', e.target.value)} />
                                </div>
                                <div className="space-y-2 sm:col-span-2">
                                    <Label htmlFor="security_notes">{t('securities.notes', 'contracts')}</Label>
                                    <textarea id="security_notes" className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" value={securityForm.data.notes} onChange={(e) => securityForm.setData('notes', e.target.value)} />
                                </div>
                                <div className="sm:col-span-2 flex justify-end">
                                    <Button type="submit" disabled={securityForm.processing}>{t('securities.create', 'contracts')}</Button>
                                </div>
                            </form>
                        )}
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">{t('securities.register_title', 'contracts')}</p>
                            <div className="overflow-x-auto rounded-md border">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/80">
                                        <tr className="border-b border-border">
                                            <th className="px-4 py-3 text-left font-medium">{t('securities.instrument_type', 'contracts')}</th>
                                            <th className="px-4 py-3 text-left font-medium">{t('securities.provider_name', 'contracts')}</th>
                                            <th className="px-4 py-3 text-left font-medium">{t('securities.reference_no', 'contracts')}</th>
                                            <th className="px-4 py-3 text-left font-medium">{t('securities.amount', 'contracts')}</th>
                                            <th className="px-4 py-3 text-left font-medium">{t('securities.status_label', 'contracts')}</th>
                                            <th className="px-4 py-3 text-left font-medium">{t('securities.issued_at', 'contracts')}</th>
                                            <th className="px-4 py-3 text-left font-medium">{t('securities.expires_at', 'contracts')}</th>
                                            <th className="px-4 py-3 text-left font-medium">{t('securities.released_at', 'contracts')}</th>
                                            <th className="px-4 py-3 text-right font-medium">{t('securities.actions', 'contracts')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {isExecutionRegistersLoading ? (
                                            <tr>
                                                <td colSpan={9} className="px-4 py-6 text-center text-sm text-muted-foreground">
                                                    {t('execution_registers.loading', 'contracts')}
                                                </td>
                                            </tr>
                                        ) : (
                                            contract_securities_display.map((s) => (
                                                <tr key={s.id} className="border-b border-border hover:bg-muted/30">
                                                    <td className="px-4 py-3">{t(`securities.types.${s.instrument_type}`, 'contracts') || labelize(s.instrument_type)}</td>
                                                    <td className="px-4 py-3">{s.provider_name}</td>
                                                    <td className="px-4 py-3 font-mono">{s.reference_no}</td>
                                                    <td className="px-4 py-3">{s.amount != null ? Number(s.amount).toLocaleString() : '—'} {s.currency ?? ''}</td>
                                                    <td className="px-4 py-3">
                                                        <Badge variant="outline" className={genericStatusBadgeClass[s.status] ?? ''}>{t(`securities.statuses.${s.status}`, 'contracts') || labelize(s.status)}</Badge>
                                                    </td>
                                                    <td className="px-4 py-3 text-xs">{s.issued_at ? new Date(s.issued_at).toLocaleDateString() : '—'}</td>
                                                    <td className="px-4 py-3 text-xs">{s.expires_at ? new Date(s.expires_at).toLocaleDateString() : '—'}</td>
                                                    <td className="px-4 py-3 text-xs">{s.released_at ? new Date(s.released_at).toLocaleDateString() : '—'}</td>
                                                    <td className="px-4 py-3 text-right">
                                                        {can.manage_securities && (
                                                            <div className="flex flex-wrap justify-end gap-2">
                                                                {s.status !== 'active' && <Button variant="outline" size="sm" onClick={() => router.post(route('contracts.securities.update-status', [contract.id, s.id]), { status: 'active' }, { preserveScroll: true })}>{t('securities.statuses.active', 'contracts')}</Button>}
                                                                {s.status !== 'expiring' && <Button variant="outline" size="sm" onClick={() => router.post(route('contracts.securities.update-status', [contract.id, s.id]), { status: 'expiring' }, { preserveScroll: true })}>{t('securities.statuses.expiring', 'contracts')}</Button>}
                                                                {s.status !== 'expired' && <Button variant="outline" size="sm" onClick={() => router.post(route('contracts.securities.update-status', [contract.id, s.id]), { status: 'expired' }, { preserveScroll: true })}>{t('securities.statuses.expired', 'contracts')}</Button>}
                                                                {s.status !== 'released' && <Button variant="outline" size="sm" onClick={() => router.post(route('contracts.securities.update-status', [contract.id, s.id]), { status: 'released' }, { preserveScroll: true })}>{t('securities.statuses.released', 'contracts')}</Button>}
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                                {!isExecutionRegistersLoading && contract_securities_display.length === 0 && (
                                    <div className="px-4 py-6 text-center text-sm text-muted-foreground">{t('securities.empty', 'contracts')}</div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('obligations.title', 'contracts')}</CardTitle>
                        <CardDescription>{t('obligations.description', 'contracts')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {obligations_summary.total > 0 && (
                            <div className="flex flex-wrap gap-4 rounded-md border p-3 text-sm">
                                <span><strong>{t('obligations.summary_total', 'contracts')}:</strong> {obligations_summary.total}</span>
                                {obligations_summary.not_started > 0 && <span>{t('obligations.statuses.not_started', 'contracts')}: {obligations_summary.not_started}</span>}
                                {obligations_summary.in_progress > 0 && <span>{t('obligations.statuses.in_progress', 'contracts')}: {obligations_summary.in_progress}</span>}
                                {obligations_summary.submitted > 0 && <span>{t('obligations.statuses.submitted', 'contracts')}: {obligations_summary.submitted}</span>}
                                {obligations_summary.fulfilled > 0 && <span>{t('obligations.statuses.fulfilled', 'contracts')}: {obligations_summary.fulfilled}</span>}
                                {obligations_summary.overdue > 0 && <span>{t('obligations.statuses.overdue', 'contracts')}: {obligations_summary.overdue}</span>}
                            </div>
                        )}
                        {!obligation_eligibility.is_ready && obligation_eligibility.issues.length > 0 && (
                            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                                <p className="font-medium">{t('obligations.not_eligible', 'contracts')}</p>
                                <ul className="mt-1 list-inside list-disc">{obligation_eligibility.issues.map((issue, i) => (<li key={i}>{issue}</li>))}</ul>
                            </div>
                        )}
                        {can.manage_obligations && obligation_eligibility.is_ready && (
                            <form onSubmit={handleCreateObligation} className="grid gap-3 rounded-md border p-3 sm:grid-cols-2">
                                <div className="space-y-2 sm:col-span-2">
                                    <Label htmlFor="obligation_title">{t('obligations.title_label', 'contracts')} *</Label>
                                    <Input id="obligation_title" value={obligationForm.data.title} onChange={(e) => obligationForm.setData('title', e.target.value)} required />
                                </div>
                                <div className="space-y-2 sm:col-span-2">
                                    <Label htmlFor="obligation_description">{t('obligations.description_label', 'contracts')}</Label>
                                    <textarea id="obligation_description" className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" value={obligationForm.data.description} onChange={(e) => obligationForm.setData('description', e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="obligation_party_type">{t('obligations.party_type', 'contracts')} *</Label>
                                    <Select value={obligationForm.data.party_type} onValueChange={(v) => obligationForm.setData('party_type', v)}>
                                        <SelectTrigger id="obligation_party_type"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {['internal', 'supplier', 'client', 'consultant'].map((p) => (
                                                <SelectItem key={p} value={p}>{t(`obligations.party_types.${p}`, 'contracts')}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="obligation_due_at">{t('obligations.due_at', 'contracts')}</Label>
                                    <Input id="obligation_due_at" type="date" value={formatDateForInput(obligationForm.data.due_at)} onChange={(e) => obligationForm.setData('due_at', e.target.value)} />
                                </div>
                                <div className="space-y-2 sm:col-span-2">
                                    <Label htmlFor="obligation_notes">{t('obligations.notes', 'contracts')}</Label>
                                    <textarea id="obligation_notes" className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" value={obligationForm.data.notes} onChange={(e) => obligationForm.setData('notes', e.target.value)} />
                                </div>
                                <div className="sm:col-span-2 flex justify-end">
                                    <Button type="submit" disabled={obligationForm.processing}>{t('obligations.create', 'contracts')}</Button>
                                </div>
                            </form>
                        )}
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">{t('obligations.register_title', 'contracts')}</p>
                            <div className="overflow-x-auto rounded-md border">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/80">
                                        <tr className="border-b border-border">
                                            <th className="px-4 py-3 text-left font-medium">{t('obligations.reference_no', 'contracts')}</th>
                                            <th className="px-4 py-3 text-left font-medium">{t('obligations.title_label', 'contracts')}</th>
                                            <th className="px-4 py-3 text-left font-medium">{t('obligations.party_type', 'contracts')}</th>
                                            <th className="px-4 py-3 text-left font-medium">{t('obligations.status_label', 'contracts')}</th>
                                            <th className="px-4 py-3 text-left font-medium">{t('obligations.due_at', 'contracts')}</th>
                                            <th className="px-4 py-3 text-left font-medium">{t('obligations.submitted_at', 'contracts')}</th>
                                            <th className="px-4 py-3 text-left font-medium">{t('obligations.fulfilled_at', 'contracts')}</th>
                                            <th className="px-4 py-3 text-right font-medium">{t('obligations.actions', 'contracts')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {isExecutionRegistersLoading ? (
                                            <tr>
                                                <td colSpan={8} className="px-4 py-6 text-center text-sm text-muted-foreground">
                                                    {t('execution_registers.loading', 'contracts')}
                                                </td>
                                            </tr>
                                        ) : (
                                            contract_obligations_display.map((o) => (
                                                <tr key={o.id} className="border-b border-border hover:bg-muted/30">
                                                    <td className="px-4 py-3 font-mono">{o.reference_no}</td>
                                                    <td className="px-4 py-3">{o.title}</td>
                                                    <td className="px-4 py-3">{t(`obligations.party_types.${o.party_type}`, 'contracts') || labelize(o.party_type)}</td>
                                                    <td className="px-4 py-3">
                                                        {o.is_overdue ? (
                                                            <Badge variant="outline" className={genericStatusBadgeClass.overdue}>{t('obligations.statuses.overdue', 'contracts')}</Badge>
                                                        ) : (
                                                            <Badge variant="outline" className={genericStatusBadgeClass[o.status] ?? ''}>{t(`obligations.statuses.${o.status}`, 'contracts') || labelize(o.status)}</Badge>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-xs">{o.due_at ? new Date(o.due_at).toLocaleDateString() : '—'}</td>
                                                    <td className="px-4 py-3 text-xs">{o.submitted_at ? new Date(o.submitted_at).toLocaleDateString() : '—'}</td>
                                                    <td className="px-4 py-3 text-xs">{o.fulfilled_at ? new Date(o.fulfilled_at).toLocaleDateString() : '—'}</td>
                                                    <td className="px-4 py-3 text-right">
                                                        {can.manage_obligations && (
                                                            <div className="flex flex-wrap justify-end gap-2">
                                                                {o.status === 'not_started' && <Button variant="outline" size="sm" onClick={() => router.post(route('contracts.obligations.update-status', [contract.id, o.id]), { status: 'in_progress' }, { preserveScroll: true })}>{t('obligations.mark_in_progress', 'contracts')}</Button>}
                                                                {(o.status === 'not_started' || o.status === 'in_progress') && <Button variant="outline" size="sm" onClick={() => router.post(route('contracts.obligations.update-status', [contract.id, o.id]), { status: 'submitted' }, { preserveScroll: true })}>{t('obligations.mark_submitted', 'contracts')}</Button>}
                                                                {(o.status === 'not_started' || o.status === 'in_progress' || o.status === 'submitted') && <Button variant="outline" size="sm" onClick={() => router.post(route('contracts.obligations.update-status', [contract.id, o.id]), { status: 'fulfilled' }, { preserveScroll: true })}>{t('obligations.mark_fulfilled', 'contracts')}</Button>}
                                                                {(o.status !== 'fulfilled' && o.is_overdue) && <Button variant="outline" size="sm" onClick={() => router.post(route('contracts.obligations.update-status', [contract.id, o.id]), { status: 'overdue' }, { preserveScroll: true })}>{t('obligations.statuses.overdue', 'contracts')}</Button>}
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                                {!isExecutionRegistersLoading && contract_obligations_display.length === 0 && (
                                    <div className="px-4 py-6 text-center text-sm text-muted-foreground">{t('obligations.empty', 'contracts')}</div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Imported draft articles</CardTitle>
                        <CardDescription>
                            Draft-local copies of contract articles imported from templates and/or the master library. Full legal
                            bodies are not expanded by default.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto rounded-md border">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/80">
                                    <tr className="border-b border-border">
                                        <th className="px-4 py-3 ltr:text-left rtl:text-right font-medium">#</th>
                                        <th className="px-4 py-3 ltr:text-left rtl:text-right font-medium">Code</th>
                                        <th className="px-4 py-3 ltr:text-left rtl:text-right font-medium">
                                            {t('workspace.draft_articles.fields.title_en', 'contracts')}
                                        </th>
                                        <th className="px-4 py-3 ltr:text-left rtl:text-right font-medium">
                                            {t('workspace.draft_articles.fields.title_ar', 'contracts')}
                                        </th>
                                        <th className="px-4 py-3 ltr:text-left rtl:text-right font-medium">Origin</th>
                                        <th className="px-4 py-3 ltr:text-left rtl:text-right font-medium">
                                            {t('workspace.draft_articles.column_tracking', 'contracts')}
                                        </th>
                                        <th className="px-4 py-3 ltr:text-left rtl:text-right font-medium">Snippet (EN)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {contract.draftArticles?.map((article, index) => (
                                        <tr key={article.id} className="border-b border-border hover:bg-muted/30">
                                            <td className="px-4 py-3 text-xs text-muted-foreground">{index + 1}</td>
                                            <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                                                {article.article_code}
                                            </td>
                                            <td className="px-4 py-3">{article.title_en}</td>
                                            <td className="px-4 py-3">{article.title_ar}</td>
                                            <td className="px-4 py-3 text-xs text-muted-foreground">
                                                {labelize(article.origin_type)}
                                            </td>
                                            <td className="px-4 py-3 align-top">
                                                <div className="flex flex-col gap-1">
                                                    {article.is_modified ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => setDraftDiffArticle(article)}
                                                            className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100 ltr:text-left rtl:text-right"
                                                            aria-label={t('workspace.draft_articles.negotiated', 'contracts')}
                                                        >
                                                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                                            {t('workspace.draft_articles.negotiated', 'contracts')}
                                                        </button>
                                                    ) : (
                                                        <span className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-900">
                                                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                                            {t('workspace.draft_articles.standard', 'contracts')}
                                                        </span>
                                                    )}
                                                    {article.is_modified &&
                                                        article.updated_by &&
                                                        article.last_edited_at && (
                                                            <span className="text-[11px] text-muted-foreground">
                                                                {t('workspace.draft_articles.modified_by', 'contracts', {
                                                                    name: article.updated_by.name,
                                                                    date: new Date(
                                                                        article.last_edited_at
                                                                    ).toLocaleString(),
                                                                })}
                                                            </span>
                                                        )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-muted-foreground">
                                                {snippet(article.content_en)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {(!contract.draftArticles || contract.draftArticles.length === 0) && (
                                <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                                    No draft articles imported yet.
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Modal
                    show={draftDiffArticle !== null}
                    onClose={() => setDraftDiffArticle(null)}
                    maxWidth="xl"
                >
                    {draftDiffArticle && (
                        <div className="space-y-4 p-1">
                            <h3 className="text-lg font-semibold">
                                {t('workspace.draft_articles.diff_title', 'contracts')}
                            </h3>
                            <p className="text-xs text-muted-foreground font-mono">{draftDiffArticle.article_code}</p>
                            {!draftDiffArticle.library_baseline ? (
                                <p className="text-sm text-muted-foreground">
                                    {t('workspace.draft_articles.diff_no_baseline', 'contracts')}
                                </p>
                            ) : (
                                <Tabs defaultValue="en" className="space-y-3">
                                    <TabsList>
                                        <TabsTrigger value="en">English</TabsTrigger>
                                        <TabsTrigger value="ar">العربية</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="en" className="space-y-4">
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div className="space-y-2">
                                                <p className="text-xs font-semibold text-muted-foreground">
                                                    {t('workspace.draft_articles.diff_library', 'contracts')}
                                                </p>
                                                <div className="rounded-md border p-3 text-sm">
                                                    <p className="mb-2 font-medium">
                                                        {draftDiffArticle.library_baseline.title_en}
                                                    </p>
                                                    <p className="whitespace-pre-wrap text-xs text-muted-foreground">
                                                        {draftDiffArticle.library_baseline.content_en}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <p className="text-xs font-semibold text-muted-foreground">
                                                    {t('workspace.draft_articles.diff_draft', 'contracts')}
                                                </p>
                                                <div className="rounded-md border p-3 text-sm">
                                                    <p className="mb-2 font-medium">{draftDiffArticle.title_en}</p>
                                                    <p className="whitespace-pre-wrap text-xs text-muted-foreground">
                                                        {draftDiffArticle.content_en}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </TabsContent>
                                    <TabsContent value="ar" className="space-y-4">
                                        <div
                                            className="grid gap-4 md:grid-cols-2"
                                            dir="rtl"
                                        >
                                            <div className="space-y-2">
                                                <p className="text-xs font-semibold text-muted-foreground">
                                                    {t('workspace.draft_articles.diff_library', 'contracts')}
                                                </p>
                                                <div className="rounded-md border p-3 text-sm">
                                                    <p className="mb-2 font-medium">
                                                        {draftDiffArticle.library_baseline.title_ar}
                                                    </p>
                                                    <p className="whitespace-pre-wrap text-xs text-muted-foreground">
                                                        {draftDiffArticle.library_baseline.content_ar}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <p className="text-xs font-semibold text-muted-foreground">
                                                    {t('workspace.draft_articles.diff_draft', 'contracts')}
                                                </p>
                                                <div className="rounded-md border p-3 text-sm">
                                                    <p className="mb-2 font-medium">{draftDiffArticle.title_ar}</p>
                                                    <p className="whitespace-pre-wrap text-xs text-muted-foreground">
                                                        {draftDiffArticle.content_ar}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            )}
                        </div>
                    )}
                </Modal>

                <Modal show={!!invoiceToReject} onClose={() => { setInvoiceToReject(null); rejectInvoiceForm.reset(); }}>
                    <form onSubmit={handleRejectInvoice} className="space-y-4">
                        <h3 className="text-lg font-semibold">{t('invoices.reject', 'contracts')}</h3>
                        {invoiceToReject && (
                            <p className="text-sm text-muted-foreground">
                                {invoiceToReject.invoice_no} — {invoiceToReject.currency ?? ''} {invoiceToReject.amount != null ? Number(invoiceToReject.amount).toLocaleString() : ''}
                            </p>
                        )}
                        <div>
                            <Label htmlFor="reject-decision_notes">{t('invoices.decision_notes', 'contracts')}</Label>
                            <Input
                                id="reject-decision_notes"
                                className="mt-1"
                                placeholder={t('invoices.decision_notes', 'contracts')}
                                value={rejectInvoiceForm.data.decision_notes}
                                onChange={(e) => rejectInvoiceForm.setData('decision_notes', e.target.value)}
                            />
                            {rejectInvoiceForm.errors.decision_notes && (
                                <p className="mt-1 text-sm text-destructive">{rejectInvoiceForm.errors.decision_notes}</p>
                            )}
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => { setInvoiceToReject(null); rejectInvoiceForm.reset(); }}>
                                Cancel
                            </Button>
                            <Button type="submit" variant="destructive" disabled={rejectInvoiceForm.processing}>
                                {t('invoices.reject', 'contracts')}
                            </Button>
                        </div>
                    </form>
                </Modal>

                <Card>
                    <CardHeader>
                        <CardTitle>Activity Timeline</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {contract.activities.length > 0 ? (
                            <div className="space-y-3">
                                {contract.activities.map((activity) => (
                                    <div key={activity.id} className="rounded-md border p-3">
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <p className="font-medium">{activity.description}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {new Date(activity.created_at).toLocaleString()}
                                            </p>
                                        </div>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {labelize(activity.activity_type)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">No activity logs available.</p>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Activity Log
                        </CardTitle>
                        <CardDescription>Global activity across the contract lifecycle</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ActivityTimeline events={timeline} />
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
