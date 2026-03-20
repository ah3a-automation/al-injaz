import SupplierPortalLayout from '@/Layouts/SupplierPortalLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Head } from '@inertiajs/react';
import { Clock } from 'lucide-react';
import { useLocale } from '@/hooks/useLocale';
import { getLocalizedSupplierName } from '@/utils/supplierDisplay';

interface PendingProps {
    supplier: { id: string; supplier_code: string; legal_name_en?: string | null; legal_name_ar?: string | null; status: string } | null;
}

export default function SupplierPortalPending({ supplier }: PendingProps) {
    const { t, locale } = useLocale();
    const supplierDisplayName = getLocalizedSupplierName(supplier, locale);

    return (
        <SupplierPortalLayout>
            <Head title={t('title_pending', 'supplier_portal')} />
            <div className="space-y-6">
                <h1 className="text-2xl font-semibold tracking-tight">
                    {t('pending_heading', 'supplier_portal')}
                </h1>
                <Card>
                    <CardHeader className="flex flex-row items-center gap-2">
                        <Clock className="h-5 w-5 text-amber-600" />
                        <CardTitle className="text-lg">{t('pending_heading', 'supplier_portal')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">
                            {t('pending_message', 'supplier_portal')}
                        </p>
                        {supplier && (
                            <p className="mt-3 text-sm text-muted-foreground">
                                <span dir="ltr" className="font-mono tabular-nums">{supplier.supplier_code}</span>
                                {' · '}
                                <span dir="auto">{supplierDisplayName}</span>
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </SupplierPortalLayout>
    );
}
