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
     * Submit or update a supplier quote for an RFQ (one row per supplier per RFQ).
     * All operations run in a single database transaction.
     *
     * @param array{supplier_id: string, items: array<string, array{unit_price: float|string, total_price: float|string, notes?: string|null}>} $data
     * @return array{quote: RfqQuote, was_update: bool}
     */
    public function execute(Rfq $rfq, array $data): array
    {
        return DB::transaction(function () use ($rfq, $data): array {
            $supplierId = $data['supplier_id'];
            $this->validateSupplierInvitation($rfq, $supplierId);
            $this->assertRfqAcceptsQuotes($rfq);

            $rfq->load('items');
            if ($rfq->items->isEmpty()) {
                throw new RuntimeException(__('rfqs.cannot_submit_quote_no_items'));
            }

            $existing = RfqQuote::query()
                ->where('rfq_id', $rfq->id)
                ->where('supplier_id', $supplierId)
                ->lockForUpdate()
                ->first();

            $wasUpdate = $existing !== null;

            if ($existing !== null) {
                $existing->update([
                    'submitted_at' => now(),
                    'status' => RfqQuote::STATUS_REVISED,
                ]);
                $quote = $existing->fresh();
                RfqQuoteItem::query()->where('rfq_quote_id', $quote->id)->delete();
            } else {
                $quote = RfqQuote::create([
                    'rfq_id' => $rfq->id,
                    'supplier_id' => $supplierId,
                    'submitted_at' => now(),
                    'status' => RfqQuote::STATUS_SUBMITTED,
                ]);
            }

            $items = [];
            $currency = $rfq->currency ?? 'SAR';
            $itemData = $data['items'] ?? [];

            foreach ($rfq->items as $item) {
                $row = $itemData[$item->id] ?? null;
                $unitPrice = $row ? (float) ($row['unit_price'] ?? 0) : 0;
                $totalPrice = $row ? (float) ($row['total_price'] ?? 0) : 0;
                $notes = isset($row['notes']) && $row['notes'] !== '' ? (string) $row['notes'] : null;

                $items[] = [
                    'id' => (string) Str::uuid(),
                    'rfq_quote_id' => $quote->id,
                    'rfq_item_id' => $item->id,
                    'unit_price' => $unitPrice,
                    'total_price' => $totalPrice,
                    'currency' => $currency,
                    'notes' => $notes,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }

            RfqQuoteItem::insert($items);

            RfqSupplier::where('rfq_id', $rfq->id)
                ->where('supplier_id', $supplierId)
                ->update([
                    'status' => 'submitted',
                    'responded_at' => now(),
                ]);

            return [
                'quote' => $quote->fresh(['items']),
                'was_update' => $wasUpdate,
            ];
        });
    }

    private function validateSupplierInvitation(Rfq $rfq, string $supplierId): void
    {
        $invited = RfqSupplier::where('rfq_id', $rfq->id)
            ->where('supplier_id', $supplierId)
            ->exists();

        if (! $invited) {
            throw new RuntimeException(__('rfqs.supplier_not_invited'));
        }
    }

    /**
     * RFQ must be in an open-response phase: issued (initial), supplier clarification stage,
     * or responses_received (e.g. resubmission after a quote revision). Terminal / evaluation
     * phases are rejected with the translated `rfqs.rfq_no_longer_accepting_quotes` message.
     */
    private function assertRfqAcceptsQuotes(Rfq $rfq): void
    {
        $allowed = [
            Rfq::STATUS_ISSUED,
            Rfq::STATUS_SUPPLIER_QUESTIONS,
            Rfq::STATUS_RESPONSES_RECEIVED,
        ];

        if (! in_array($rfq->status, $allowed, true)) {
            throw new RuntimeException(__('rfqs.rfq_no_longer_accepting_quotes'));
        }
    }
}
