import { Card, CardContent } from '@/Components/ui/card';
import { useLocale } from '@/hooks/useLocale';

interface EditProfileSummaryCardProps {
    supplierCode?: string | null;
    supplierStatusLabel: string;
    completenessPercent: number;
    completedSectionsLabel?: string | null;
    requiredDocsStatus: string;
    requiredDocsDetail?: string | null;
}

export default function EditProfileSummaryCard({
    supplierCode,
    supplierStatusLabel,
    completenessPercent,
    completedSectionsLabel,
    requiredDocsStatus,
    requiredDocsDetail,
}: EditProfileSummaryCardProps) {
    const { t } = useLocale();

    return (
        <Card className="rounded-xl border border-border/60 bg-card shadow-sm">
            <CardContent className="space-y-4 p-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                        <p className="text-sm font-semibold text-foreground">
                            {t('profile_section_overview', 'supplier_portal')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {t('profile_completeness_helper', 'supplier_portal')}
                        </p>
                    </div>
                    <span className="text-lg font-semibold tabular-nums">{completenessPercent}%</span>
                </div>

                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                        className={`h-2 rounded-full transition-all ${
                            completenessPercent === 100
                                ? 'bg-emerald-500'
                                : completenessPercent >= 60
                                    ? 'bg-amber-500'
                                    : 'bg-red-500'
                        }`}
                        style={{ width: `${completenessPercent}%` }}
                    />
                </div>

                {completedSectionsLabel && (
                    <p className="text-xs text-muted-foreground">{completedSectionsLabel}</p>
                )}

                <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                        <p className="text-xs text-muted-foreground">
                            {t('supplier_code', 'supplier_portal')}
                        </p>
                        <p className="mt-1 font-medium" dir="ltr">
                            {supplierCode || '—'}
                        </p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                        <p className="text-xs text-muted-foreground">
                            {t('col_status', 'suppliers')}
                        </p>
                        <p className="mt-1 font-medium">{supplierStatusLabel}</p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                        <p className="text-xs text-muted-foreground">
                            {t('edit_profile_completeness', 'supplier_portal')}
                        </p>
                        <p className="mt-1 font-medium tabular-nums">{completenessPercent}%</p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                        <p className="text-xs text-muted-foreground">
                            {t('mandatory_docs', 'suppliers')}
                        </p>
                        <p className="mt-1 font-medium">{requiredDocsStatus}</p>
                    </div>
                </div>

                {requiredDocsDetail && (
                    <p className="text-xs text-muted-foreground">{requiredDocsDetail}</p>
                )}
            </CardContent>
        </Card>
    );
}
