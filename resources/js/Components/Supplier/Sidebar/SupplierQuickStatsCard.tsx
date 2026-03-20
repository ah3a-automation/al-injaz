import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import type { SupplierDocument } from '@/types';
import { getMandatoryDocumentStatus } from '@/utils/suppliers';
import { useLocale } from '@/hooks/useLocale';

interface SupplierQuickStatsCardProps {
    contactsCount: number;
    documents?: Array<Pick<SupplierDocument, 'document_type'>> | undefined;
    categoriesCount?: number | null;
    certificationsCount?: number | null;
}

export default function SupplierQuickStatsCard({
    contactsCount,
    documents = [],
    categoriesCount = 0,
    certificationsCount = 0,
}: SupplierQuickStatsCardProps) {
    const { t } = useLocale();
    const mandatoryStatus = getMandatoryDocumentStatus(documents);
    const resolvedCategoriesCount = categoriesCount ?? 0;
    const resolvedCertificationsCount = certificationsCount ?? 0;

    return (
        <Card id="summary-metrics">
            <CardHeader className="py-3">
                <CardTitle className="text-sm">{t('quick_stats', 'suppliers')}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 pb-6 pt-0 text-sm">
                <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('contacts_count', 'suppliers')}</span>
                    <span className="font-medium tabular-nums">{contactsCount}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('documents_count', 'suppliers')}</span>
                    <span className="font-medium tabular-nums">{documents.length}</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t('mandatory_docs', 'suppliers')}</span>
                    {mandatoryStatus.complete ? (
                        <span className="text-xs font-medium text-green-600">
                            {t('complete', 'suppliers')}
                        </span>
                    ) : (
                        <span className="text-xs font-medium text-amber-600">
                            {mandatoryStatus.missing.length}
                        </span>
                    )}
                </div>
                {resolvedCategoriesCount > 0 && (
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('categories', 'suppliers')}</span>
                        <span className="font-medium tabular-nums">{resolvedCategoriesCount}</span>
                    </div>
                )}
                {resolvedCertificationsCount > 0 && (
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('tab_certifications', 'suppliers')}</span>
                        <span className="font-medium tabular-nums">{resolvedCertificationsCount}</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
