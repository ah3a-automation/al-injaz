import { Button } from '@/Components/ui/button';
import { useLocale } from '@/hooks/useLocale';
import { AlertTriangle, Download, Eye, FileText } from 'lucide-react';

export interface DocumentItem {
    id: string;
    name: string;
    document_type?: string | null;
    version?: number;
    is_current?: boolean;
    uploaded_at?: string | null;
    uploaded_by?: string | null;
    download_url: string;
    preview_url?: string | null;
}

interface Props {
    documents: DocumentItem[];
    missingDocuments?: string[];
    showVersions?: boolean;
    emptyMessage?: string;
    renderActions?: (doc: DocumentItem) => React.ReactNode;
}

export function DocumentList({
    documents,
    missingDocuments = [],
    showVersions = false,
    emptyMessage,
    renderActions,
}: Props) {
    const { t } = useLocale();

    const currentDocs = documents.filter((d) => d.is_current !== false);
    const olderDocs = documents.filter((d) => d.is_current === false);

    return (
        <div className="space-y-4">
            {missingDocuments.length > 0 && (
                <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <div>
                        <p className="text-sm font-medium text-amber-800">
                            {t('missing_documents_warning', 'documents')}
                        </p>
                        <ul className="mt-1 space-y-0.5">
                            {missingDocuments.map((type) => (
                                <li key={type} className="text-xs text-amber-700">
                                    • {t(`doc_type_${type}`, 'documents') || type}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            {currentDocs.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                    {emptyMessage ?? t('no_documents', 'documents')}
                </p>
            ) : (
                <div className="divide-y divide-border rounded-lg border">
                    {currentDocs.map((doc) => (
                        <div
                            key={doc.id}
                            className="flex items-center justify-between gap-3 px-4 py-3"
                        >
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                                    <p className="truncate text-sm font-medium">{doc.name}</p>
                                    {showVersions && doc.version && doc.version > 1 && (
                                        <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                                            v{doc.version}
                                        </span>
                                    )}
                                    {doc.is_current === true &&
                                        doc.version &&
                                        doc.version > 1 && (
                                            <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700">
                                                {t('latest', 'documents')}
                                            </span>
                                        )}
                                </div>
                                {(doc.document_type ||
                                    doc.uploaded_at ||
                                    doc.uploaded_by) && (
                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                        {doc.document_type
                                            ? t(
                                                  `doc_type_${doc.document_type}`,
                                                  'documents',
                                              ) || doc.document_type
                                            : null}
                                        {doc.uploaded_at &&
                                            ` · ${doc.uploaded_at}`}
                                        {doc.uploaded_by &&
                                            ` · ${doc.uploaded_by}`}
                                    </p>
                                )}
                            </div>
                            <div className="flex items-center gap-1">
                                {doc.preview_url && (
                                    <a
                                        href={doc.preview_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            type="button"
                                        >
                                            <Eye className="h-4 w-4" />
                                            <span className="sr-only">
                                                {t('preview', 'documents')}
                                            </span>
                                        </Button>
                                    </a>
                                )}
                                <a href={doc.download_url} download>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        type="button"
                                    >
                                        <Download className="h-4 w-4" />
                                        <span className="sr-only">
                                            {t('download', 'documents')}
                                        </span>
                                    </Button>
                                </a>
                                {renderActions && renderActions(doc)}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showVersions && olderDocs.length > 0 && (
                <details className="text-sm">
                    <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                        {olderDocs.length}{' '}
                        {t('previous_versions', 'documents')}
                    </summary>
                    <div className="mt-2 divide-y divide-border rounded-lg border opacity-60">
                        {olderDocs.map((doc) => (
                            <div
                                key={doc.id}
                                className="flex items-center justify-between gap-3 px-4 py-2"
                            >
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs">
                                        {doc.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {doc.version
                                            ? `v${doc.version}`
                                            : null}
                                        {doc.uploaded_at &&
                                            ` · ${doc.uploaded_at}`}
                                    </p>
                                </div>
                                <a href={doc.download_url} download>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        type="button"
                                    >
                                        <Download className="h-3 w-3" />
                                    </Button>
                                </a>
                            </div>
                        ))}
                    </div>
                </details>
            )}
        </div>
    );
}

