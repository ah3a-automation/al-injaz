import AppLayout from '@/Layouts/AppLayout';
import Modal from '@/Components/Modal';
import { Button } from '@/Components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/Components/ui/card';
import { Label } from '@/Components/ui/label';
import { Textarea } from '@/Components/ui/Textarea';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useLocale } from '@/hooks/useLocale';
import { useState } from 'react';
import { Badge } from '@/Components/ui/badge';

interface ContractArticleVersion {
    id: string;
    version_number: number;
    title_ar: string;
    title_en: string;
    content_ar: string;
    content_en: string;
    change_summary?: string | null;
    risk_tags?: string[] | null;
}

interface ContractArticle {
    id: string;
    code: string;
    serial: number;
    category: string;
    status: string;
    approval_status?: string;
    rejection_reason?: string | null;
    internal_notes: string | null;
    current_version?: ContractArticleVersion | null;
    versions: ContractArticleVersion[];
}

interface ShowProps {
    article: ContractArticle;
    can: {
        update: boolean;
        submit_for_approval?: boolean;
        approve_contracts?: boolean;
        approve_legal?: boolean;
        reject?: boolean;
        restore_version?: boolean;
    };
}

function riskTagLabelKey(tag: string): `risk_tag_${string}` {
    return `risk_tag_${tag}` as `risk_tag_${string}`;
}

function riskTagBadgeClass(tag: string): string {
    const palette: Record<string, string> = {
        payment: 'bg-amber-100 text-amber-900',
        delay_damages: 'bg-orange-100 text-orange-900',
        retention: 'bg-yellow-100 text-yellow-900',
        warranty: 'bg-sky-100 text-sky-900',
        termination: 'bg-red-100 text-red-900',
        indemnity: 'bg-purple-100 text-purple-900',
        insurance: 'bg-cyan-100 text-cyan-900',
        variation: 'bg-indigo-100 text-indigo-900',
        dispute_resolution: 'bg-violet-100 text-violet-900',
        liability: 'bg-rose-100 text-rose-900',
        confidentiality: 'bg-slate-200 text-slate-900',
        force_majeure: 'bg-emerald-100 text-emerald-900',
    };
    return palette[tag] ?? 'bg-muted text-foreground';
}

function approvalLabel(status: string | undefined, t: (k: string, ns: 'contract_articles') => string): string {
    switch (status) {
        case 'submitted':
            return t('approval_submitted', 'contract_articles');
        case 'contracts_approved':
            return t('approval_contracts_ok', 'contract_articles');
        case 'legal_approved':
            return t('approval_legal_ok', 'contract_articles');
        case 'rejected':
            return t('approval_rejected', 'contract_articles');
        default:
            return t('approval_none', 'contract_articles');
    }
}

export default function Show({ article, can }: ShowProps) {
  const currentVersion = article.current_version ?? null;
  const { t } = useLocale();
    const [rejectOpen, setRejectOpen] = useState(false);
    const rejectForm = useForm({ rejection_reason: '' });

    const submitReject = (e: React.FormEvent) => {
        e.preventDefault();
        rejectForm.post(route('contract-articles.reject', article.id), {
            preserveScroll: true,
            onSuccess: () => {
                setRejectOpen(false);
                rejectForm.reset();
            },
        });
    };

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
                            {t('serial', 'contract_articles')}: {article.serial} ·{' '}
                            {t('approval_status', 'contract_articles')}:{' '}
                            {approvalLabel(article.approval_status, t)}
                        </p>
                        {article.rejection_reason && (
                            <p className="text-sm text-destructive mt-1">
                                {t('reject_reason_label', 'contract_articles')}: {article.rejection_reason}
                            </p>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-2">
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
                        {can.submit_for_approval && (
                            <Button
                                type="button"
                                onClick={() =>
                                    router.post(route('contract-articles.submit-for-approval', article.id))
                                }
                            >
                                {t('action_submit', 'contract_articles')}
                            </Button>
                        )}
                        {can.approve_contracts && (
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() =>
                                    router.post(route('contract-articles.approve-contracts', article.id))
                                }
                            >
                                {t('action_approve_contracts', 'contract_articles')}
                            </Button>
                        )}
                        {can.approve_legal && (
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() =>
                                    router.post(route('contract-articles.approve-legal', article.id))
                                }
                            >
                                {t('action_approve_legal', 'contract_articles')}
                            </Button>
                        )}
                        {can.reject && (
                            <Button type="button" variant="destructive" onClick={() => setRejectOpen(true)}>
                                {t('action_reject', 'contract_articles')}
                            </Button>
                        )}
                    </div>
                </div>

                <Modal show={rejectOpen} onClose={() => setRejectOpen(false)} maxWidth="md">
                    <form onSubmit={submitReject} className="p-6 space-y-4">
                        <h2 className="text-lg font-semibold">{t('reject_dialog_title', 'contract_articles')}</h2>
                        <div className="space-y-2">
                            <Label htmlFor="rejection_reason">{t('reject_reason_label', 'contract_articles')}</Label>
                            <Textarea
                                id="rejection_reason"
                                value={rejectForm.data.rejection_reason}
                                onChange={(e) => rejectForm.setData('rejection_reason', e.target.value)}
                                required
                                rows={4}
                            />
                            {rejectForm.errors.rejection_reason && (
                                <p className="text-sm text-destructive">{rejectForm.errors.rejection_reason}</p>
                            )}
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setRejectOpen(false)}>
                                {t('action_cancel', 'contract_articles')}
                            </Button>
                            <Button type="submit" disabled={rejectForm.processing}>
                                {t('action_reject', 'contract_articles')}
                            </Button>
                        </div>
                    </form>
                </Modal>

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
                                    {currentVersion.risk_tags &&
                                        currentVersion.risk_tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5">
                                                {currentVersion.risk_tags.map((tag) => (
                                                    <Badge
                                                        key={tag}
                                                        variant="secondary"
                                                        className={`text-[11px] font-normal ${riskTagBadgeClass(tag)}`}
                                                    >
                                                        {t(riskTagLabelKey(tag), 'contract_articles')}
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}

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
                                                <div className="flex flex-wrap justify-end gap-2">
                                                    {can.update && currentVersion && (
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
                                                    )}
                                                    {can.restore_version &&
                                                        currentVersion &&
                                                        currentVersion.id !== version.id && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() =>
                                                                    router.post(
                                                                        route(
                                                                            'contract-articles.versions.restore',
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

