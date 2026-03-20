import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Banknote } from 'lucide-react';
import { useLocale } from '@/hooks/useLocale';

interface SupplierPaymentCardProps {
    preferredCurrency: string | null;
    paymentTermsDays: number | null;
}

const CURRENCY_LABELS: Record<string, string> = {
    SAR: 'SAR',
    USD: 'USD',
    EUR: 'EUR',
    AED: 'AED',
    GBP: 'GBP',
};

export default function SupplierPaymentCard({
    preferredCurrency,
    paymentTermsDays,
}: SupplierPaymentCardProps) {
    const { t } = useLocale();
    const currencyLabel = preferredCurrency ? (CURRENCY_LABELS[preferredCurrency] ?? preferredCurrency) : '—';
    const termsLabel = paymentTermsDays != null ? `${paymentTermsDays} days` : '—';

    return (
        <Card className="rounded-xl border border-border/60 bg-card shadow-sm">
            <CardHeader className="border-b border-border/40 px-4 py-2.5">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <Banknote className="h-4 w-4 text-muted-foreground" />
                    {t('profile_payment_preferences', 'supplier_portal')}
                </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-0 sm:grid-cols-3 p-4">
                <div className="py-1 text-start">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t('profile_preferred_currency', 'supplier_portal')}
                    </p>
                    <p className="text-sm font-medium tabular-nums text-foreground">{currencyLabel}</p>
                </div>
                <div className="py-1 text-start">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t('profile_payment_terms', 'supplier_portal')}
                    </p>
                    <p className="text-sm font-medium tabular-nums text-foreground">{termsLabel}</p>
                </div>
                <div className="py-1 text-start">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t('profile_payment_method', 'supplier_portal')}
                    </p>
                    <p className="text-sm font-medium text-foreground">—</p>
                </div>
            </CardContent>
        </Card>
    );
}
