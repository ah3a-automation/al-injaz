import { useState } from 'react';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { useLocale } from '@/hooks/useLocale';
import Modal from '@/Components/Modal';
import { Textarea } from '@/Components/ui/Textarea';
import { Label } from '@/Components/ui/label';

export type ApprovalStatus = 'draft' | 'submitted' | 'approved' | 'rejected';

interface ApprovalStatusPanelProps {
    approvalStatus: ApprovalStatus;
    approvedBy?: string;
    approvedAt?: string;
    approvalNotes?: string;
    submittedAt?: string;
    can: {
        submit: boolean;
        approve: boolean;
        reject: boolean;
    };
    onSubmit: () => void;
    onApprove: () => void;
    onReject: (notes: string) => void;
    entityLabel: string;
    translationNamespace?: 'rfqs' | 'packages';
}

const statusBadgeClass: Record<ApprovalStatus, string> = {
    draft: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    submitted: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export function ApprovalStatusPanel({
    approvalStatus,
    approvedBy,
    approvedAt,
    approvalNotes,
    submittedAt,
    can,
    onSubmit,
    onApprove,
    onReject,
    entityLabel,
    translationNamespace = 'rfqs',
}: ApprovalStatusPanelProps) {
    const { t } = useLocale();
    const [showRejectDialog, setShowRejectDialog] = useState(false);
    const [rejectNotes, setRejectNotes] = useState('');

    const handleRejectConfirm = () => {
        if (rejectNotes.trim()) {
            onReject(rejectNotes.trim());
            setRejectNotes('');
            setShowRejectDialog(false);
        }
    };

    const ns = translationNamespace;

    return (
        <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground text-start">
                        {ns === 'packages' ? t('package_approval', ns) : t('approval_status', ns)} — {entityLabel}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge className={statusBadgeClass[approvalStatus]}>
                            {t(approvalStatus, ns)}
                        </Badge>
                        {(approvalStatus === 'approved' && (approvedBy || approvedAt)) && (
                            <p className="text-xs text-muted-foreground text-start">
                                {t('approved_by', ns)}: {approvedBy ?? '—'} · {approvedAt ?? '—'}
                            </p>
                        )}
                        {(approvalStatus === 'rejected' && approvalNotes) && (
                            <p className="text-xs text-muted-foreground text-start line-clamp-1 max-w-md">
                                {approvalNotes}
                            </p>
                        )}
                        {submittedAt && approvalStatus === 'submitted' && (
                            <p className="text-xs text-muted-foreground text-start">
                                {t('submitted_at', ns)}: {submittedAt}
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t('approval_status', ns)}>
                    {can.submit && (approvalStatus === 'draft' || approvalStatus === 'rejected') && (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onSubmit();
                            }}
                        >
                            {t('submit_for_approval', ns)}
                        </Button>
                    )}
                    {can.approve && approvalStatus === 'submitted' && (
                        <Button
                            type="button"
                            size="sm"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onApprove();
                            }}
                        >
                            {t('approve', ns)}
                        </Button>
                    )}
                    {can.reject && approvalStatus === 'submitted' && (
                        <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setShowRejectDialog(true);
                            }}
                        >
                            {t('reject', ns)}
                        </Button>
                    )}
                </div>
            </div>

            <Modal
                show={showRejectDialog}
                onClose={() => {
                    setShowRejectDialog(false);
                    setRejectNotes('');
                }}
                maxWidth="md"
            >
                <div className="p-4">
                    <h3 className="text-lg font-semibold text-start mb-2">
                        {t('reject', ns)} — {entityLabel}
                    </h3>
                    <div className="space-y-2">
                        <Label htmlFor="reject-notes" className="text-start">
                            {t('approval_notes', ns)} *
                        </Label>
                        <Textarea
                            id="reject-notes"
                            value={rejectNotes}
                            onChange={(e) => setRejectNotes(e.target.value)}
                            placeholder={t('enter_rejection_reason', ns)}
                            rows={4}
                            className="resize-none"
                        />
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setShowRejectDialog(false);
                                setRejectNotes('');
                            }}
                        >
                            {t('cancel', 'ui')}
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={handleRejectConfirm}
                            disabled={!rejectNotes.trim()}
                        >
                            {t('reject', ns)}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
