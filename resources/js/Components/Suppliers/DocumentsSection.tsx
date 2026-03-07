import type { Supplier, SupplierDocument } from '@/types';
import {
    getMandatoryDocumentStatus,
} from '@/utils/suppliers';
import { Button } from '@/Components/ui/button';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/Components/ui/card';
import { Link, router } from '@inertiajs/react';
import { Plus, FileText, Trash2 } from 'lucide-react';

interface DocumentsSectionProps {
    supplier: Supplier;
    canEdit: boolean;
}

export function DocumentsSection({ supplier, canEdit }: DocumentsSectionProps) {
    const documents = supplier.documents ?? [];
    const { complete, missing } = getMandatoryDocumentStatus(documents);

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle>Documents</CardTitle>
                {canEdit && (
                    <Button size="sm" asChild>
                        <Link href={route('suppliers.show', supplier.id)}>
                            <Plus className="h-4 w-4" />
                            Add
                        </Link>
                    </Button>
                )}
            </CardHeader>
            <CardContent className="space-y-3">
                {!complete && missing.length > 0 && (
                    <p className="text-sm text-amber-600">
                        Missing mandatory: {missing.join(', ')}
                    </p>
                )}
                {documents.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No documents yet.</p>
                ) : (
                    <ul className="space-y-2">
                        {documents.map((d: SupplierDocument) => (
                            <li
                                key={d.id}
                                className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/30 px-3 py-2"
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                                    <span className="truncate text-sm">{d.file_name}</span>
                                    {d.is_mandatory && (
                                        <span className="shrink-0 text-xs text-muted-foreground">
                                            (required)
                                        </span>
                                    )}
                                </div>
                                {canEdit && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="shrink-0 text-destructive"
                                        aria-label="Delete document"
                                        onClick={() => {
                                            if (confirm('Delete this document?')) {
                                                router.delete(
                                                    route('suppliers.documents.destroy', [
                                                        supplier.id,
                                                        d.id,
                                                    ])
                                                );
                                            }
                                        }}
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}
