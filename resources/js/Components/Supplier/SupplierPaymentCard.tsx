import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Banknote } from 'lucide-react';

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
    const currencyLabel = preferredCurrency ? (CURRENCY_LABELS[preferredCurrency] ?? preferredCurrency) : '—';
    const termsLabel = paymentTermsDays != null ? `${paymentTermsDays} days` : '—';

    return (
        <Card className="rounded-xl shadow-sm">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                    <Banknote className="h-4 w-4" />
                    Payment Preferences
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Preferred Currency</span>
                    <span>{currencyLabel}</span>
                </div>
                <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Payment Terms</span>
                    <span>{termsLabel}</span>
                </div>
                <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Payment Method</span>
                    <span>—</span>
                </div>
            </CardContent>
        </Card>
    );
}
