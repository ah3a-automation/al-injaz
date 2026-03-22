import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { memo } from 'react';
import { useLocale } from '@/hooks/useLocale';

interface RfqItem {
    id: string;
    code: string | null;
    description_en: string;
    unit: string | null;
    qty: string | null;
    estimated_cost: string;
}

interface QuoteItemRowProps {
    item: RfqItem;
    currency: string;
    unitPrice: string;
    totalPrice: string;
    onUnitPriceChange: (itemId: string, value: string) => void;
    onTotalPriceChange: (itemId: string, value: string) => void;
}

function QuoteItemRowComponent({
    item,
    currency,
    unitPrice,
    totalPrice,
    onUnitPriceChange,
    onTotalPriceChange,
}: QuoteItemRowProps) {
    const { t } = useLocale();
    return (
        <div className="grid gap-3 border-b pb-4 sm:grid-cols-3">
            <div className="min-w-0 sm:col-span-2">
                <p className="font-medium text-sm">{item.description_en}</p>
                <p className="text-xs text-muted-foreground">
                    {t('qty', 'supplier_portal')}: <span dir="ltr" className="font-mono tabular-nums">{item.qty ?? '—'}</span>
                    {' · '}
                    {t('est_cost', 'supplier_portal')} <span dir="ltr" className="font-mono tabular-nums">{item.estimated_cost}</span> {currency}
                </p>
            </div>
            <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:gap-2">
                <div className="min-w-0 flex-1">
                    <Label className="text-xs">{t('quote_unit_price', 'supplier_portal')}</Label>
                    <Input
                        className="w-full"
                        type="number"
                        step="0.01"
                        min="0"
                        value={unitPrice}
                        onChange={(e) => onUnitPriceChange(item.id, e.target.value)}
                    />
                </div>
                <div className="min-w-0 flex-1">
                    <Label className="text-xs">{t('total', 'supplier_portal')}</Label>
                    <Input
                        className="w-full"
                        type="number"
                        step="0.01"
                        min="0"
                        value={totalPrice}
                        onChange={(e) => onTotalPriceChange(item.id, e.target.value)}
                    />
                </div>
            </div>
        </div>
    );
}

export const QuoteItemRow = memo(QuoteItemRowComponent);
