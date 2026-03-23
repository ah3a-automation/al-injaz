import AppLayout from '@/Layouts/AppLayout';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/Components/ui/card';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Check } from 'lucide-react';
import { useLocale } from '@/hooks/useLocale';

interface QuoteLine {
    rfq_item_id: string | null;
    code: string | null;
    description_en: string;
    unit: string | null;
    qty: string | null;
    unit_price: string | null;
    total_price: string | null;
    included_in_other: boolean;
    notes: string | null;
}

interface AttachmentRow {
    id: number;
    name: string;
    file_name: string;
    size_bytes: number;
    mime_type: string | null;
    url: string;
    download_url: string;
}

interface ShowProps {
    rfq: {
        id: string;
        rfq_number: string;
        title: string;
        currency: string;
    };
    quote: {
        id: string;
        status: string;
        supplier: { id: string; legal_name_en: string; supplier_code: string } | null;
        submitted_at: string | null;
        revision_no: number | null;
        total_amount: number;
        has_snapshot: boolean;
        lines: QuoteLine[];
        attachments: AttachmentRow[];
    };
    back_url: string;
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
}

export default function RfqSupplierQuoteShow({ rfq, quote, back_url }: ShowProps) {
    const { t } = useLocale();

    return (
        <AppLayout>
            <Head title={`${t('quote_detail_title', 'rfqs')} — ${quote.supplier?.legal_name_en ?? ''}`} />
            <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
                <div className="flex flex-wrap items-center gap-3">
                    <Button variant="outline" size="sm" asChild>
                        <Link href={back_url}>
                            <ArrowLeft className="me-2 h-4 w-4" />
                            {t('quote_detail_back', 'rfqs')}
                        </Link>
                    </Button>
                    <div className="min-w-0 flex-1">
                        <p className="text-muted-foreground text-sm">
                            {rfq.rfq_number} · {rfq.title}
                        </p>
                        <h1 className="text-2xl font-semibold tracking-tight">{t('quote_detail_title', 'rfqs')}</h1>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>{quote.supplier?.legal_name_en ?? '—'}</CardTitle>
                        <CardDescription>
                            {quote.supplier?.supplier_code ? `${quote.supplier.supplier_code} · ` : ''}
                            {rfq.currency}{' '}
                            {quote.total_amount.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                            <p className="text-muted-foreground text-xs">{t('quote_detail_status', 'rfqs')}</p>
                            <Badge variant="outline" className="mt-1 capitalize">
                                {quote.status}
                            </Badge>
                        </div>
                        <div>
                            <p className="text-muted-foreground text-xs">{t('quote_detail_revision', 'rfqs')}</p>
                            <p className="mt-1 text-sm tabular-nums">{quote.revision_no ?? '—'}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground text-xs">{t('quote_detail_submitted_at', 'rfqs')}</p>
                            <p className="mt-1 text-sm tabular-nums">
                                {quote.submitted_at ? new Date(quote.submitted_at).toLocaleString() : '—'}
                            </p>
                        </div>
                        <div>
                            <p className="text-muted-foreground text-xs">{t('quote_detail_total', 'rfqs')}</p>
                            <p className="mt-1 text-sm font-medium tabular-nums">
                                {rfq.currency}{' '}
                                {quote.total_amount.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {!quote.has_snapshot && (
                    <p className="text-muted-foreground text-sm" role="status">
                        {t('quote_detail_snapshot_fallback', 'rfqs')}
                    </p>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle>{t('quote_detail_items', 'rfqs')}</CardTitle>
                    </CardHeader>
                    <CardContent className="overflow-x-auto p-0">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/80">
                                <tr className="border-b border-border">
                                    <th className="px-4 py-3 text-start font-medium">Code</th>
                                    <th className="px-4 py-3 text-start font-medium">Description</th>
                                    <th className="px-4 py-3 text-end font-medium">Qty</th>
                                    <th className="px-4 py-3 text-end font-medium">Unit price</th>
                                    <th className="px-4 py-3 text-end font-medium">Total</th>
                                    <th className="px-4 py-3 text-center font-medium">{t('quote_detail_included', 'rfqs')}</th>
                                    <th className="px-4 py-3 text-start font-medium">{t('quote_detail_notes', 'rfqs')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {quote.lines.map((line, idx) => (
                                    <tr
                                        key={line.rfq_item_id ?? `line-${idx}`}
                                        className="border-b border-border hover:bg-muted/30"
                                    >
                                        <td className="px-4 py-3 font-mono">{line.code ?? '—'}</td>
                                        <td className="px-4 py-3">{line.description_en || '—'}</td>
                                        <td className="px-4 py-3 text-end tabular-nums">{line.qty ?? '—'}</td>
                                        <td className="px-4 py-3 text-end tabular-nums">
                                            {line.unit_price !== null && line.unit_price !== ''
                                                ? parseFloat(line.unit_price).toLocaleString(undefined, {
                                                      maximumFractionDigits: 4,
                                                  })
                                                : '—'}
                                        </td>
                                        <td className="px-4 py-3 text-end tabular-nums">
                                            {line.total_price !== null && line.total_price !== ''
                                                ? parseFloat(line.total_price).toLocaleString(undefined, {
                                                      maximumFractionDigits: 2,
                                                  })
                                                : '—'}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {line.included_in_other ? (
                                                <Check className="mx-auto h-4 w-4 text-primary" aria-label="Yes" />
                                            ) : (
                                                <span className="text-muted-foreground">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">{line.notes ?? '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {quote.lines.length === 0 && (
                            <p className="text-muted-foreground p-6 text-sm">{t('quote_detail_no_lines', 'rfqs')}</p>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('quote_detail_attachments', 'rfqs')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {quote.attachments.length > 0 ? (
                            <ul className="space-y-2">
                                {quote.attachments.map((attachment) => (
                                    <li
                                        key={attachment.id}
                                        className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                                    >
                                        <span className="min-w-0 truncate">{attachment.name}</span>
                                        <div className="flex items-center gap-3">
                                            <span className="text-muted-foreground text-xs">
                                                {formatBytes(attachment.size_bytes)}
                                            </span>
                                            <a
                                                href={attachment.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-primary hover:underline"
                                            >
                                                {t('quote_detail_open', 'rfqs')}
                                            </a>
                                            <a href={attachment.download_url} className="text-primary hover:underline">
                                                {t('quote_detail_download', 'rfqs')}
                                            </a>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-muted-foreground text-sm">{t('quote_detail_no_attachments', 'rfqs')}</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
