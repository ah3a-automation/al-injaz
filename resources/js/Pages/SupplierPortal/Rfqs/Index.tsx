import SupplierPortalLayout from '@/Layouts/SupplierPortalLayout';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import { Head, Link } from '@inertiajs/react';
import { Eye } from 'lucide-react';
import { useLocale } from '@/hooks/useLocale';

interface RfqRow {
    id: string;
    rfq_number: string;
    title: string;
    status: string;
    submission_deadline: string | null;
    created_at: string;
    project?: { id: string; name: string; name_en: string | null } | null;
    procurement_package?: { id: string; package_no: string | null; name: string } | null;
    suppliers_count: number;
    rfq_quotes_count: number;
}

interface IndexProps {
    rfqs: { data: RfqRow[]; path: string; per_page: number; next_cursor: string | null; prev_cursor: string | null };
    tab: 'open' | 'closed';
}

export default function SupplierPortalRfqsIndex({ rfqs, tab }: IndexProps) {
    const { t } = useLocale();
    return (
        <SupplierPortalLayout>
            <Head title={t('title_rfqs', 'supplier_portal')} />
            <div className="space-y-6">
                <h1 className="text-2xl font-semibold tracking-tight">{t('title_rfqs', 'supplier_portal')}</h1>
                <p className="text-muted-foreground">{t('portal_subtitle_rfqs', 'supplier_portal')}</p>

                <div className="flex gap-2 border-b border-border pb-2">
                    <Button
                        variant={tab === 'open' ? 'default' : 'ghost'}
                        size="sm"
                        asChild
                    >
                        <Link href={route('supplier.rfqs.index', { tab: 'open' })} preserveState>
                            {t('tab_open_rfqs', 'supplier_portal')}
                        </Link>
                    </Button>
                    <Button
                        variant={tab === 'closed' ? 'default' : 'ghost'}
                        size="sm"
                        asChild
                    >
                        <Link href={route('supplier.rfqs.index', { tab: 'closed' })} preserveState>
                            {t('tab_closed_rfqs', 'supplier_portal')}
                        </Link>
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>{tab === 'open' ? t('tab_open_rfqs', 'supplier_portal') : t('tab_closed_rfqs', 'supplier_portal')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {rfqs.data.length === 0 ? (
                            <p className="text-muted-foreground py-4">
                                {tab === 'open' ? t('empty_rfqs_open', 'supplier_portal') : t('empty_rfqs_closed', 'supplier_portal')}
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {rfqs.data.map((rfq) => (
                                    <div key={rfq.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-4">
                                        <div>
                                            <p className="font-medium">{rfq.title}</p>
                                            <p className="text-sm text-muted-foreground">
                                                <span dir="ltr" className="font-mono tabular-nums">{rfq.rfq_number}</span>
                                                {rfq.submission_deadline && (
                                                    <>
                                                        {' · '}
                                                        {t('col_deadline', 'supplier_portal')}: <span dir="ltr" className="font-mono tabular-nums">{new Date(rfq.submission_deadline).toLocaleDateString()}</span>
                                                    </>
                                                )}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="secondary">{t(`status_${rfq.status.replace(/-/g, '_')}` as 'status_open', 'supplier_portal')}</Badge>
                                            <Button asChild size="sm">
                                                <Link href={route('supplier.rfqs.show', rfq.id)}>
                                                    <Eye className="h-4 w-4 me-1" />
                                                    {t('action_view', 'supplier_portal')}
                                                </Link>
                                            </Button>
                                        </div>
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
