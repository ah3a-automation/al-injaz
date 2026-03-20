import SupplierPortalLayout from '@/Layouts/SupplierPortalLayout';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Head, Link } from '@inertiajs/react';
import { Eye } from 'lucide-react';
import { useLocale } from '@/hooks/useLocale';

interface RfqRow {
    id: string;
    rfq_number: string;
    title: string;
    status: string;
    created_at: string;
    project?: { id: string; name: string; name_en: string | null } | null;
    procurement_package?: { id: string; package_no: string | null; name: string } | null;
}

interface IndexProps {
    quotations: { data: RfqRow[]; path: string; per_page: number; next_cursor: string | null; prev_cursor: string | null };
}

export default function SupplierPortalQuotationsIndex({ quotations }: IndexProps) {
    const { t } = useLocale();
    return (
        <SupplierPortalLayout>
            <Head title={t('title_quotations', 'supplier_portal')} />
            <div className="space-y-6">
                <h1 className="text-2xl font-semibold tracking-tight">{t('title_quotations', 'supplier_portal')}</h1>
                <p className="text-muted-foreground">{t('portal_subtitle_quotations', 'supplier_portal')}</p>
                <Card>
                    <CardHeader>
                        <CardTitle>{t('my_quotations', 'supplier_portal')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {quotations.data.length === 0 ? (
                            <p className="text-muted-foreground py-4">{t('empty_quotations', 'supplier_portal')}</p>
                        ) : (
                            <div className="space-y-2">
                                {quotations.data.map((rfq) => (
                                    <div key={rfq.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-4">
                                        <div>
                                            <p className="font-medium">{rfq.title}</p>
                                            <p className="text-sm text-muted-foreground"><span dir="ltr" className="font-mono tabular-nums">{rfq.rfq_number}</span></p>
                                        </div>
                                        <Button asChild size="sm">
                                            <Link href={route('supplier.rfqs.show', rfq.id)}>
                                                <Eye className="h-4 w-4 me-1" />
                                                {t('action_view_rfq', 'supplier_portal')}
                                            </Link>
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </SupplierPortalLayout>
    );
}
