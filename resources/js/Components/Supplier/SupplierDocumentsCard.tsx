import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { FileText, Download, Eye } from 'lucide-react';

interface DocumentItem {
    id: string;
    document_type: string;
    file_name: string;
    file_path: string;
    expiry_date: string | null;
}

const DOC_TYPE_LABELS: Record<string, string> = {
    commercial_registration: 'Commercial Registration',
    unified_number: 'Unified Number',
    vat_certificate: 'VAT Certificate',
    business_license: 'Business License',
    national_address: 'National Address',
    bank_letter: 'Bank Letter',
    company_profile: 'Company Profile',
    iso_certificate: 'ISO Certificate',
    other: 'Other',
};

interface SupplierDocumentsCardProps {
    documents: DocumentItem[];
}

function getDocumentUrl(filePath: string): string {
    return filePath.startsWith('http') ? filePath : `/storage/${filePath}`;
}

export default function SupplierDocumentsCard({ documents }: SupplierDocumentsCardProps) {
    return (
        <Card className="rounded-xl shadow-sm">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="h-4 w-4" />
                    Documents
                </CardTitle>
            </CardHeader>
            <CardContent>
                {documents.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No documents uploaded.</p>
                ) : (
                    <ul className="space-y-3">
                        {documents.map((doc) => {
                            const label = DOC_TYPE_LABELS[doc.document_type] ?? doc.document_type;
                            const url = getDocumentUrl(doc.file_path);
                            return (
                                <li
                                    key={doc.id}
                                    className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                                >
                                    <div className="min-w-0">
                                        <p className="font-medium text-sm">{label}</p>
                                        <p className="truncate text-xs text-muted-foreground">{doc.file_name}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" asChild>
                                            <a href={url} target="_blank" rel="noopener noreferrer">
                                                <Eye className="me-1 h-3 w-3" />
                                                View
                                            </a>
                                        </Button>
                                        <Button variant="outline" size="sm" asChild>
                                            <a href={url} download={doc.file_name}>
                                                <Download className="me-1 h-3 w-3" />
                                                Download
                                            </a>
                                        </Button>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}
