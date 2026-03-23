<?php

declare(strict_types=1);

namespace App\Application\Procurement\Services;

use App\Models\RfqItem;
use App\Models\RfqQuoteItem;
use RuntimeException;

/**
 * Resolves supplier line input into priced / included-in-other / unpriced states.
 *
 * Unpriced: not included and no explicit unit price (null or empty string).
 * Priced: not included and numeric unit price ≥ 0 (including explicit zero).
 * Included: included_in_other true → unit and total stored as 0.
 */
final class RfqQuoteLineResolver
{
    public const STATE_PRICED = 'priced';

    public const STATE_INCLUDED = 'included';

    public const STATE_UNPRICED = 'unpriced';

    /**
     * @param array{unit_price?: mixed, included_in_other?: mixed, notes?: string|null}|null $row
     * @return array{state: string, unit_price: float|null, total_price: float|null, included_in_other: bool}
     */
    public static function resolveForPersistence(RfqItem $rfqItem, ?array $row): array
    {
        $row = $row ?? [];
        $included = self::toBool($row['included_in_other'] ?? false);

        if ($included) {
            return [
                'state' => self::STATE_INCLUDED,
                'unit_price' => 0.0,
                'total_price' => 0.0,
                'included_in_other' => true,
            ];
        }

        $raw = $row['unit_price'] ?? null;
        if (self::isEmptyPriceInput($raw)) {
            return [
                'state' => self::STATE_UNPRICED,
                'unit_price' => null,
                'total_price' => null,
                'included_in_other' => false,
            ];
        }

        if (! is_numeric($raw)) {
            throw new RuntimeException(__('rfqs.quote_line_unit_price_invalid'));
        }

        $unit = (float) $raw;
        if ($unit < 0) {
            throw new RuntimeException(__('rfqs.unit_price_negative'));
        }

        $qty = self::qtyAsFloat($rfqItem->qty);

        return [
            'state' => self::STATE_PRICED,
            'unit_price' => $unit,
            'total_price' => round($qty * $unit, 4),
            'included_in_other' => false,
        ];
    }

    /**
     * Summarize current draft or persisted quote lines for UI (read model).
     *
     * @param array<string, array{unit_price?: mixed, included_in_other?: mixed}>|null $draftItems keyed by rfq_item_id
     * @param \Illuminate\Support\Collection<int, RfqQuoteItem>|null $quoteItems
     * @return array{
     *     total_items: int,
     *     priced_items_count: int,
     *     included_items_count: int,
     *     unpriced_items_count: int,
     *     total_quotation_amount: float
     * }
     */
    public static function summarize(
        \Illuminate\Support\Collection $rfqItems,
        ?array $draftItems,
        $quoteItems
    ): array {
        $priced = 0;
        $included = 0;
        $unpriced = 0;
        $totalAmount = 0.0;

        foreach ($rfqItems as $rfqItem) {
            /** @var RfqItem $rfqItem */
            $row = null;
            if (is_array($draftItems) && array_key_exists($rfqItem->id, $draftItems)) {
                $row = $draftItems[$rfqItem->id];
            } elseif ($quoteItems !== null) {
                $line = $quoteItems->firstWhere('rfq_item_id', $rfqItem->id);
                if ($line !== null) {
                    $row = [
                        'unit_price' => $line->unit_price,
                        'included_in_other' => $line->included_in_other,
                    ];
                }
            }

            $resolved = self::resolveForPersistence($rfqItem, $row);
            if ($resolved['state'] === self::STATE_INCLUDED) {
                $included++;
            } elseif ($resolved['state'] === self::STATE_UNPRICED) {
                $unpriced++;
            } else {
                $priced++;
                $totalAmount += (float) ($resolved['total_price'] ?? 0);
            }
        }

        return [
            'total_items' => $rfqItems->count(),
            'priced_items_count' => $priced,
            'included_items_count' => $included,
            'unpriced_items_count' => $unpriced,
            'total_quotation_amount' => round($totalAmount, 4),
        ];
    }

    private static function toBool(mixed $value): bool
    {
        return filter_var($value, FILTER_VALIDATE_BOOLEAN);
    }

    private static function isEmptyPriceInput(mixed $raw): bool
    {
        if ($raw === null) {
            return true;
        }
        if (is_string($raw) && trim($raw) === '') {
            return true;
        }

        return false;
    }

    private static function qtyAsFloat(mixed $qty): float
    {
        if ($qty === null || $qty === '') {
            return 0.0;
        }

        return is_numeric($qty) ? (float) $qty : 0.0;
    }
}
