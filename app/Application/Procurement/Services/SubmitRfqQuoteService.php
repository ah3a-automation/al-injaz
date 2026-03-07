<?php

declare(strict_types=1);

namespace App\Application\Procurement\Services;

use App\Models\Rfq;
use App\Models\RfqQuote;
use App\Models\RfqQuoteItem;
use App\Models\RfqSupplier;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

final class SubmitRfqQuoteService
{
    /**
     * Submit a supplier quote for an RFQ: validate invitation, create quote + items (batch), update supplier response.
     * All operations run in a single database transaction.
     *
     * @param array{supplier_id: string, items: array<string, array{unit_price: float|string, total_price: float|string, notes?: string|null}>} $data
     */
    public function execute(Rfq $rfq, array $data): RfqQuote
    {
        return DB::transaction(function () use ($rfq, $data): RfqQuote {
            $supplierId = $data['supplier_id'];
            $this->validateSupplierInvitation($rfq, $supplierId);

            $rfq->load('items');
            if ($rfq->items->isEmpty()) {
                throw new RuntimeException('Cannot submit quote because RFQ has no items.');
            }

            $quote = RfqQuote::create([
                'rfq_id'      => $rfq->id,
                'supplier_id' => $supplierId,
                'submitted_at'=> now(),
                'status'      => RfqQuote::STATUS_SUBMITTED,
            ]);

            $items = [];
            $currency = $rfq->currency ?? 'SAR';
            $itemData = $data['items'] ?? [];

            foreach ($rfq->items as $item) {
                $row = $itemData[$item->id] ?? null;
                $unitPrice = $row ? (float) ($row['unit_price'] ?? 0) : 0;
                $totalPrice = $row ? (float) ($row['total_price'] ?? 0) : 0;
                $notes = isset($row['notes']) && $row['notes'] !== '' ? (string) $row['notes'] : null;

                $items[] = [
                    'id'            => (string) Str::uuid(),
                    'rfq_quote_id' => $quote->id,
                    'rfq_item_id'  => $item->id,
                    'unit_price'   => $unitPrice,
                    'total_price'  => $totalPrice,
                    'currency'     => $currency,
                    'notes'        => $notes,
                    'created_at'   => now(),
                    'updated_at'   => now(),
                ];
            }

            RfqQuoteItem::insert($items);

            RfqSupplier::where('rfq_id', $rfq->id)
                ->where('supplier_id', $supplierId)
                ->update([
                    'status'       => 'submitted',
                    'responded_at' => now(),
                ]);

            return $quote;
        });
    }

    private function validateSupplierInvitation(Rfq $rfq, string $supplierId): void
    {
        $invited = RfqSupplier::where('rfq_id', $rfq->id)
            ->where('supplier_id', $supplierId)
            ->exists();

        if (! $invited) {
            throw new RuntimeException('Supplier is not invited to this RFQ.');
        }
    }
}
