import type { Supplier, SupplierDocument } from '@/types';
import { getMandatoryDocumentStatus } from '@/utils/suppliers';
import { Button } from '@/Components/ui/button';
import {
    Card,
    CardContent,
} from '@/Components/ui/card';
import { router } from '@inertiajs/react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { useLocale } from '@/hooks/useLocale';
import { useMemo, useState } from 'react';
import SupplierDocumentsCard from '@/Components/Supplier/Documents/SupplierDocumentsCard';

interface DocumentsSectionProps {
    supplier: Supplier;
    canEdit?: boolean;
    manageHref?: string | null;
    manageLabel?: string | null;
    emptyActionLabel?: string | null;
    showDeleteAction?: boolean;
}

type DocumentStatus = 'expired' | 'expiring_soon' | 'valid' | 'no_expiry';
type DocumentFilter = 'all' | 'current' | 'expired' | 'expiring_soon' | 'mandatory';

export function DocumentsSection({
    supplier,
    canEdit = false,
    manageHref,
    manageLabel,
    emptyActionLabel,
    showDeleteAction,
}: DocumentsSectionProps) {
    const { t } = useLocale();
    const documents = supplier.documents ?? [];
    const { complete, missing } = getMandatoryDocumentStatus(documents);
    const [filter, setFilter] = useState<DocumentFilter>('all');
    const effectiveManageHref = manageHref ?? (canEdit ? route('suppliers.edit', supplier.id) + '#documents' : null);
    const effectiveManageLabel = manageLabel ?? (effectiveManageHref ? t('upload_document_short', 'supplier_portal') : null);
    const effectiveEmptyActionLabel =
        emptyActionLabel ?? (effectiveManageHref ? t('profile_upload_first_document', 'supplier_portal') : null);
    const allowDeleteAction = showDeleteAction ?? canEdit;

    const classifyDocument = (doc: SupplierDocument): DocumentStatus => {
        if (doc.expiry_status === 'expired' || doc.expiry_status === 'expiring_soon' || doc.expiry_status === 'valid' || doc.expiry_status === 'no_expiry') {
            return doc.expiry_status;
        }

        if (!doc.expiry_date) return 'no_expiry';
        const today = new Date();
        const exp = new Date(doc.expiry_date);
        today.setHours(0, 0, 0, 0);
        exp.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays <= 0) return 'expired';
        if (diffDays <= 30) return 'expiring_soon';
        return 'valid';
    };

    const withStatus = useMemo(
        () =>
            documents.map((d) => {
                const status = classifyDocument(d);
                return { doc: d, status };
            }),
        [documents]
    );

    const summary = useMemo(() => {
        const total = documents.length;
        const currentCount = documents.filter((d) => d.is_current !== false).length;
        let expired = 0;
        let expiringSoon = 0;
        for (const item of withStatus) {
            if (item.status === 'expired') expired += 1;
            else if (item.status === 'expiring_soon') expiringSoon += 1;
        }
        return {
            total,
            currentCount,
            expired,
            expiringSoon,
            mandatoryMissingCount: complete ? 0 : missing.length,
        };
    }, [documents, withStatus, complete, missing.length]);

    const filtered = useMemo(() => {
        return withStatus.filter(({ doc, status }) => {
            if (filter === 'current') return doc.is_current !== false;
            if (filter === 'expired') return status === 'expired';
            if (filter === 'expiring_soon') return status === 'expiring_soon';
            if (filter === 'mandatory') return doc.is_mandatory;
            return true;
        });
    }, [withStatus, filter]);

    const filteredDocuments = useMemo(
        () =>
            filtered.map(({ doc }) => ({
                ...doc,
                mime_type: doc.mime_type ?? null,
                created_at: doc.created_at ?? null,
                preview_url: doc.preview_url ?? null,
                download_url: doc.download_url ?? doc.preview_url ?? null,
            })),
        [filtered]
    );

    return (
        <div className="space-y-3">
            <Card className="rounded-xl border border-border/60 bg-card shadow-sm">
                <CardContent className="space-y-3 p-4">
                    {!complete && missing.length > 0 && (
                        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/30">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-300" />
                            <div>
                                <p className="text-sm font-medium text-amber-800 dark:text-amber-100">
                                    {t('missing_documents_warning', 'documents')}
                                </p>
                                <ul className="mt-1 space-y-0.5">
                                    {missing.map((type) => (
                                        <li key={type} className="text-xs text-amber-700 dark:text-amber-200">
                                            • {t('upload_document_named', 'documents', {
                                                document: t(`doc_type_${type}`, 'documents') || type,
                                            })}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}

                    {/* Summary strip */}
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5 text-sm">
                        <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                            <p className="text-xs text-muted-foreground">
                                {t('documents_total', 'documents')}
                            </p>
                            <p className="mt-1 font-medium tabular-nums">{summary.total}</p>
                        </div>
                        <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                            <p className="text-xs text-muted-foreground">
                                {t('documents_current', 'documents')}
                            </p>
                            <p className="mt-1 font-medium tabular-nums">{summary.currentCount}</p>
                        </div>
                        <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                            <p className="text-xs text-muted-foreground">
                                {t('documents_expired', 'documents')}
                            </p>
                            <p className="mt-1 font-medium tabular-nums text-red-700">
                                {summary.expired}
                            </p>
                        </div>
                        <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                            <p className="text-xs text-muted-foreground">
                                {t('documents_expiring_soon', 'documents')}
                            </p>
                            <p className="mt-1 font-medium tabular-nums text-amber-700">
                                {summary.expiringSoon}
                            </p>
                        </div>
                        <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                            <p className="text-xs text-muted-foreground">
                                {t('documents_mandatory_missing', 'documents')}
                            </p>
                            <p className="mt-1 font-medium tabular-nums">
                                {summary.mandatoryMissingCount}
                            </p>
                        </div>
                    </div>

                    {/* Local filters */}
                    {documents.length > 0 && (
                        <div className="flex flex-wrap gap-2 text-xs">
                            {(
                                [
                                    { id: 'all', label: t('filter_all', 'documents') },
                                    { id: 'current', label: t('filter_current', 'documents') },
                                    { id: 'expired', label: t('filter_expired', 'documents') },
                                    { id: 'expiring_soon', label: t('filter_expiring_soon', 'documents') },
                                    { id: 'mandatory', label: t('filter_mandatory', 'documents') },
                                ] as { id: DocumentFilter; label: string }[]
                            ).map((f) => (
                                <button
                                    key={f.id}
                                    type="button"
                                    onClick={() => setFilter(f.id)}
                                    className={`rounded-full border px-2 py-0.5 ${
                                        filter === f.id
                                            ? 'border-primary bg-primary/10 text-primary'
                                            : 'border-border bg-muted text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <SupplierDocumentsCard
                documents={filteredDocuments}
                actionHref={effectiveManageHref}
                actionLabel={effectiveManageLabel}
                emptyActionLabel={effectiveEmptyActionLabel}
                showLatestOnly
                showHistoryToggle
                hideMandatoryGuidance
                renderRowActions={
                    allowDeleteAction
                        ? (doc) => (
                              <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 shrink-0 text-destructive"
                                  aria-label={t('action_delete', 'suppliers')}
                                  type="button"
                                  onClick={() => {
                                      if (confirm('Delete this document?')) {
                                          router.delete(
                                              route('suppliers.documents.destroy', [
                                                  supplier.id,
                                                  doc.id,
                                              ]),
                                          );
                                      }
                                  }}
                              >
                                  <Trash2 className="h-3 w-3" />
                              </Button>
                          )
                        : undefined
                }
            />
        </div>
    );
}
