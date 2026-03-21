import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { FileText, Download, Eye, Image, Table2, FileUp } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { differenceInCalendarDays, differenceInDays } from 'date-fns';
import { Link } from '@inertiajs/react';
import { useLocale } from '@/hooks/useLocale';
import { DocumentPreviewModal } from '@/Components/Supplier/Documents/DocumentPreviewModal';
import { DocumentPreviewPanel } from '@/Components/Supplier/Documents/DocumentPreviewPanel';
import { cn } from '@/lib/utils';
import { getMandatoryDocumentStatus } from '@/utils/suppliers';

interface DocumentItem {
    id: string;
    document_type: string;
    file_name: string;
    file_path: string;
    mime_type?: string | null;
    expiry_date: string | null;
    version?: number | null;
    is_current?: boolean | null;
    created_at?: string | null;
    source?: string | null;
    preview_url?: string | null;
    download_url?: string | null;
    remaining_days?: number | null;
    expiry_status?: 'valid' | 'expiring_soon' | 'expired' | 'no_expiry' | null;
    is_mandatory?: boolean | null;
}

const DOC_TYPE_KEYS: Record<string, string> = {
    commercial_registration: 'doc_type_commercial_registration',
    national_address: 'doc_type_national_address',
    unified_number: 'doc_type_unified_number',
    vat_certificate: 'doc_type_vat_certificate',
    business_license: 'doc_type_business_license',
    bank_letter: 'doc_type_bank_letter',
    credit_application: 'doc_type_credit_application',
    company_profile: 'doc_type_company_profile',
    iso_certificate: 'doc_type_iso_certificate',
    other: 'doc_type_other',
};

const DOC_TYPE_ORDER = [
    'commercial_registration',
    'national_address',
    'vat_certificate',
    'unified_number',
    'bank_letter',
    'credit_application',
    'company_profile',
    'iso_certificate',
    'other',
] as const;

const DOC_TYPE_ORDER_MAP = new Map<string, number>(
    DOC_TYPE_ORDER.map((documentType, index) => [documentType, index])
);

interface SupplierDocumentsCardProps {
    documents: DocumentItem[];
    actionHref?: string | null;
    actionLabel?: string | null;
    emptyActionLabel?: string | null;
    onActionClick?: () => void;
    renderRowActions?: (doc: DocumentItem) => ReactNode;
    showLatestOnly?: boolean;
    showHistoryToggle?: boolean;
    hideMandatoryGuidance?: boolean;
}

type ExpiryStatus = 'valid' | 'expiring_soon' | 'expired' | 'no_expiry';

function formatDate(
    s: string | null | undefined,
    locale: string,
    options?: Intl.DateTimeFormatOptions
): string {
    if (!s) return '—';
    try {
        return new Date(s).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', options);
    } catch {
        return '—';
    }
}

function getFileIcon(fileName: string) {
    const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
    if (['pdf'].includes(ext)) return FileText;
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) return Image;
    if (['xls', 'xlsx', 'csv'].includes(ext)) return Table2;
    return FileText;
}

function getDocumentTypeSortIndex(documentType: string): number {
    return DOC_TYPE_ORDER_MAP.get(documentType) ?? DOC_TYPE_ORDER.length + 1;
}

function compareDocumentVersionsForDisplay(a: DocumentItem, b: DocumentItem) {
    const currentDiff = Number(b.is_current === true) - Number(a.is_current === true);
    if (currentDiff !== 0) {
        return currentDiff;
    }

    const versionDiff = (b.version ?? 1) - (a.version ?? 1);
    if (versionDiff !== 0) {
        return versionDiff;
    }

    const createdAtTimestampA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const createdAtTimestampB = b.created_at ? new Date(b.created_at).getTime() : 0;
    const createdAtA = Number.isFinite(createdAtTimestampA) ? createdAtTimestampA : 0;
    const createdAtB = Number.isFinite(createdAtTimestampB) ? createdAtTimestampB : 0;
    if (createdAtB !== createdAtA) {
        return createdAtB - createdAtA;
    }

    return a.file_name.localeCompare(b.file_name);
}

function compareDocumentsForDisplay(a: DocumentItem, b: DocumentItem) {
    const orderDiff = getDocumentTypeSortIndex(a.document_type) - getDocumentTypeSortIndex(b.document_type);

    if (orderDiff !== 0) {
        return orderDiff;
    }

    if (a.document_type !== b.document_type) {
        return a.document_type.localeCompare(b.document_type);
    }

    return compareDocumentVersionsForDisplay(a, b);
}

function buildLatestDocumentsView(documents: DocumentItem[]) {
    const groupedDocuments = new Map<string, DocumentItem[]>();

    documents.forEach((doc) => {
        const existingGroup = groupedDocuments.get(doc.document_type);

        if (existingGroup) {
            existingGroup.push(doc);
            return;
        }

        groupedDocuments.set(doc.document_type, [doc]);
    });

    const latestDocuments: DocumentItem[] = [];
    const allDocuments: DocumentItem[] = [];
    let hiddenCount = 0;

    [...groupedDocuments.entries()]
        .sort(([documentTypeA], [documentTypeB]) => {
            const orderDiff =
                getDocumentTypeSortIndex(documentTypeA) - getDocumentTypeSortIndex(documentTypeB);

            return orderDiff !== 0 ? orderDiff : documentTypeA.localeCompare(documentTypeB);
        })
        .forEach(([, group]) => {
            const orderedGroup = [...group].sort(compareDocumentVersionsForDisplay);

            latestDocuments.push(orderedGroup[0]);
            allDocuments.push(...orderedGroup);
            hiddenCount += Math.max(0, orderedGroup.length - 1);
        });

    return {
        latestDocuments,
        allDocuments,
        hiddenCount,
    };
}

export default function SupplierDocumentsCard({
    documents,
    actionHref,
    actionLabel,
    emptyActionLabel,
    onActionClick,
    renderRowActions,
    showLatestOnly = false,
    showHistoryToggle = false,
    hideMandatoryGuidance = false,
}: SupplierDocumentsCardProps) {
    const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);
    const [showAllVersions, setShowAllVersions] = useState(false);
    const { t, locale } = useLocale();
    const latestDocumentsView = showLatestOnly ? buildLatestDocumentsView(documents) : null;
    const visibleDocuments = latestDocumentsView
        ? showAllVersions
            ? latestDocumentsView.allDocuments
            : latestDocumentsView.latestDocuments
        : [...documents].sort(compareDocumentsForDisplay);
    const shouldShowHistoryToggle =
        showLatestOnly &&
        showHistoryToggle &&
        (latestDocumentsView?.hiddenCount ?? 0) > 0;
    const missingMandatoryTypes = hideMandatoryGuidance
        ? []
        : getMandatoryDocumentStatus(documents).missing;

    const getExpiryInfo = (doc: DocumentItem) => {
        const days =
            typeof doc.remaining_days === 'number'
                ? doc.remaining_days
                : doc.expiry_date
                  ? differenceInDays(new Date(doc.expiry_date), new Date())
                  : null;
        const status =
            doc.expiry_status ??
            (days === null
                ? 'no_expiry'
                : days < 0
                  ? 'expired'
                  : days <= 30
                    ? 'expiring_soon'
                    : 'valid');

        const styles: Record<
            ExpiryStatus,
            {
                label: string;
                days: number | null;
                daysClassName: string;
                badgeClassName: string;
                rowClassName: string;
            }
        > = {
            valid: {
                label: t('valid', 'supplier_portal'),
                days,
                daysClassName: 'text-emerald-700 dark:text-emerald-300',
                badgeClassName:
                    'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-300',
                rowClassName: '',
            },
            expiring_soon: {
                label: t('expiring_soon', 'supplier_portal'),
                days,
                daysClassName: 'text-amber-700 dark:text-amber-300',
                badgeClassName:
                    'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300',
                rowClassName:
                    'border-amber-200/70 bg-amber-50/35 dark:border-amber-900/40 dark:bg-amber-950/10',
            },
            expired: {
                label: t('expired', 'supplier_portal'),
                days,
                daysClassName: 'text-red-700 dark:text-red-300',
                badgeClassName:
                    'border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300',
                rowClassName:
                    'border-red-200/70 bg-red-50/35 dark:border-red-900/40 dark:bg-red-950/10',
            },
            no_expiry: {
                label: t('no_expiry', 'documents'),
                days: null,
                daysClassName: 'text-muted-foreground',
                badgeClassName:
                    'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300',
                rowClassName: '',
            },
        };

        return styles[status as ExpiryStatus] ?? styles.no_expiry;
    };

    const renderExpiryDate = (doc: DocumentItem) => {
        if (!doc.expiry_date) {
            return (
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300">
                    {t('no_expiry', 'documents')}
                </span>
            );
        }

        return <span className="text-xs text-muted-foreground">{formatDate(doc.expiry_date, locale)}</span>;
    };

    const getDocTypeLabel = (documentType: string) => {
        const key = DOC_TYPE_KEYS[documentType];
        if (key) {
            try {
                return t(key, 'documents');
            } catch {
                return documentType;
            }
        }
        return documentType;
    };

    const getSourceLabel = (source: string | null | undefined) => {
        if (!source) {
            return null;
        }

        const sourceKey = `source_${source}`;
        const translated = t(sourceKey, 'documents');

        return translated === sourceKey ? null : translated;
    };

    const getSourceBadgeClassName = (source: string | null | undefined) => {
        switch (source) {
        case 'supplier':
            return 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/50 dark:bg-sky-950/20 dark:text-sky-300';
        case 'procurement':
            return 'border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-900/50 dark:bg-cyan-950/20 dark:text-cyan-300';
        case 'admin':
            return 'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200';
        default:
            return 'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200';
        }
    };

    const getUpdatedLabel = (createdAt: string | null | undefined) => {
        if (!createdAt) {
            return null;
        }

        const updatedAt = new Date(createdAt);

        if (Number.isNaN(updatedAt.getTime())) {
            return null;
        }

        const daysAgo = differenceInCalendarDays(new Date(), updatedAt);

        if (daysAgo === 0) {
            return t('updated_today', 'documents');
        }

        if (daysAgo === 1) {
            return t('updated_yesterday', 'documents');
        }

        if (daysAgo > 1 && daysAgo <= 6) {
            return t('updated_days_ago', 'documents', { count: daysAgo });
        }

        return t('updated_on', 'documents', {
            date: formatDate(createdAt, locale, { day: 'numeric', month: 'short', year: 'numeric' }),
        });
    };

    const renderActionButton = ({
        label,
        variant,
        className,
    }: {
        label?: string | null;
        variant: 'default' | 'outline';
        className: string;
    }) => {
        if (!label) {
            return null;
        }

        if (actionHref) {
            return (
                <Button variant={variant} size="sm" className={className} asChild>
                    <Link href={actionHref}>
                        <FileUp className="me-2 h-4 w-4" />
                        {label}
                    </Link>
                </Button>
            );
        }

        if (onActionClick) {
            return (
                <Button
                    type="button"
                    variant={variant}
                    size="sm"
                    className={className}
                    onClick={onActionClick}
                >
                    <FileUp className="me-2 h-4 w-4" />
                    {label}
                </Button>
            );
        }

        return null;
    };

    return (
        <Card className="rounded-xl border border-border/60 bg-card shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-border/40 px-4 py-2.5">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    {t('profile_documents', 'supplier_portal')}
                </CardTitle>
                {renderActionButton({
                    label: actionLabel,
                    variant: 'outline',
                    className: 'h-8',
                })}
            </CardHeader>
            <CardContent className="p-4">
                {missingMandatoryTypes.length > 0 && (
                    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-3 dark:border-amber-900/40 dark:bg-amber-950/20">
                        <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">
                            {t('missing_documents_warning', 'documents')}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {missingMandatoryTypes.map((documentType) => (
                                <span
                                    key={documentType}
                                    className="inline-flex items-center rounded-full border border-amber-200 bg-white/80 px-2.5 py-1 text-[11px] font-medium text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200"
                                >
                                    {t('upload_document_named', 'documents', {
                                        document: getDocTypeLabel(documentType),
                                    })}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {documents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 py-8 px-4 text-center">
                        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                            <FileText className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <h3 className="text-sm font-semibold text-foreground">
                            {t('profile_no_documents_uploaded', 'supplier_portal')}
                        </h3>
                        <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                            {t('profile_documents_empty_help', 'supplier_portal')}
                        </p>
                        {renderActionButton({
                            label: emptyActionLabel ?? actionLabel,
                            variant: 'default',
                            className: 'mt-4 h-8',
                        })}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border/60 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                    <th className="px-3 py-2 text-start">{t('profile_doc_type', 'supplier_portal')}</th>
                                    <th className="px-3 py-2 text-start">{t('profile_doc_file', 'supplier_portal')}</th>
                                    <th className="px-3 py-2 text-center">{t('version', 'documents')}</th>
                                    <th className="px-3 py-2 text-start">{t('expiry_date', 'supplier_portal')}</th>
                                    <th className="px-3 py-2 text-center">{t('remaining_days', 'supplier_portal')}</th>
                                    <th className="px-3 py-2 text-center">{t('profile_doc_status', 'supplier_portal')}</th>
                                    <th className="px-3 py-2 text-end">{t('profile_actions', 'supplier_portal')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visibleDocuments.map((doc) => {
                                    const label = getDocTypeLabel(doc.document_type);
                                    const DocIcon = getFileIcon(doc.file_name);
                                    const expiryInfo = getExpiryInfo(doc);
                                    const isCurrent = doc.is_current ?? true;
                                    const version = doc.version ?? 1;
                                    const downloadUrl = doc.download_url ?? doc.preview_url ?? null;
                                    const sourceLabel = getSourceLabel(doc.source);
                                    const updatedLabel = getUpdatedLabel(doc.created_at);

                                    return (
                                        <tr
                                            key={doc.id}
                                            className={cn(
                                                'border-b border-border/40 transition-colors last:border-b-0 hover:bg-muted/20',
                                                expiryInfo.rowClassName
                                            )}
                                        >
                                            <td className="px-3 py-2">
                                                <div className="space-y-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <DocIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                                                        <span>{label}</span>
                                                    </div>
                                                    {(sourceLabel || updatedLabel) && (
                                                        <div className="flex flex-wrap items-center gap-2 ps-6 text-[11px] text-muted-foreground">
                                                            {sourceLabel && (
                                                                <Badge
                                                                    variant="outline"
                                                                    className={cn(
                                                                        'rounded-full px-1.5 py-0 text-[10px] font-medium shadow-none',
                                                                        getSourceBadgeClassName(doc.source)
                                                                    )}
                                                                >
                                                                    {sourceLabel}
                                                                </Badge>
                                                            )}
                                                            {updatedLabel && (
                                                                <span>{updatedLabel}</span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-3 py-2">
                                                <div className="flex items-start gap-3">
                                                    <div className="w-[120px] flex-none">
                                                        <DocumentPreviewPanel
                                                            label={label}
                                                            fileName={doc.file_name}
                                                            mimeType={doc.mime_type ?? null}
                                                            previewUrl={doc.preview_url ?? null}
                                                            emptyText={t('no_documents', 'documents')}
                                                            onClick={doc.preview_url ? () => setPreviewDoc(doc) : undefined}
                                                        />
                                                    </div>
                                                    <span className="min-w-0 truncate pt-1 text-xs text-muted-foreground">{doc.file_name}</span>
                                                </div>
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                                <span className="font-mono text-xs tabular-nums">v{version}</span>
                                                {isCurrent && version > 1 && (
                                                    <span className="ms-1 inline-flex rounded-full border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-[10px] font-medium text-sky-700 dark:border-sky-900/50 dark:bg-sky-950/20 dark:text-sky-300">
                                                        {t('profile_latest', 'supplier_portal')}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-3 py-2">{renderExpiryDate(doc)}</td>
                                            <td className="px-3 py-2 text-center">
                                                {expiryInfo.days !== null ? (
                                                    <span
                                                        className={cn(
                                                            'font-mono text-xs tabular-nums',
                                                            expiryInfo.daysClassName
                                                        )}
                                                    >
                                                        {expiryInfo.days}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">—</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                                <Badge
                                                    variant="outline"
                                                    className={cn(
                                                        'text-xs font-semibold shadow-none',
                                                        expiryInfo.badgeClassName
                                                    )}
                                                >
                                                    {expiryInfo.label}
                                                </Badge>
                                            </td>
                                            <td className="px-3 py-2 text-end">
                                                <div className="inline-flex gap-1">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8"
                                                        onClick={() => {
                                                            if (!doc.preview_url) return;
                                                            setPreviewDoc(doc);
                                                        }}
                                                        disabled={!doc.preview_url}
                                                    >
                                                        <Eye className="me-1 h-3 w-3" />
                                                        {t('profile_view', 'supplier_portal')}
                                                    </Button>
                                                    {downloadUrl ? (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-8"
                                                            asChild
                                                        >
                                                            <a href={downloadUrl} download={doc.file_name}>
                                                                <Download className="me-1 h-3 w-3" />
                                                                {t('profile_download', 'supplier_portal')}
                                                            </a>
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-8"
                                                            disabled
                                                        >
                                                            <Download className="me-1 h-3 w-3" />
                                                            {t('profile_download', 'supplier_portal')}
                                                        </Button>
                                                    )}
                                                    {renderRowActions?.(doc)}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {shouldShowHistoryToggle && (
                    <div className="mt-4 flex justify-end border-t border-border/40 pt-3">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => setShowAllVersions((current) => !current)}
                        >
                            {showAllVersions
                                ? t('profile_show_latest_only', 'supplier_portal')
                                : t('profile_show_all_versions', 'supplier_portal')}
                        </Button>
                    </div>
                )}
            </CardContent>

            {previewDoc && (
                <DocumentPreviewModal
                    open={true}
                    onClose={() => setPreviewDoc(null)}
                    label={getDocTypeLabel(previewDoc.document_type)}
                    fileName={previewDoc.file_name}
                    mimeType={previewDoc.mime_type ?? null}
                    previewUrl={previewDoc.preview_url ?? null}
                />
            )}
        </Card>
    );
}
