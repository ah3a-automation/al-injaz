<?php

declare(strict_types=1);

namespace App\Application\Procurement\Services;

use App\Models\Rfq;
use App\Models\RfqQuote;
use App\Models\RfqQuoteItem;
use App\Models\RfqSupplier;
use App\Models\RfqSupplierQuote;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

final class SubmitRfqQuoteService
{
    /**
     * Submit or update a supplier quote for an RFQ (one row per supplier per RFQ).
     * Total line amount = qty × unit price unless the line is marked included in another item.
     *
     * @param array{supplier_id: string, items: array<string, array{unit_price?: float|string|null, included_in_other?: bool, notes?: string|null}>} $data
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

            $hadPriorSubmission = RfqSupplierQuote::query()
                ->where('rfq_id', $rfq->id)
                ->where('supplier_id', $supplierId)
                ->exists();

            $statusAfterSubmit = $hadPriorSubmission ? RfqQuote::STATUS_REVISED : RfqQuote::STATUS_SUBMITTED;

            if ($existing !== null) {
                $existing->update([
                    'submitted_at' => now(),
                    'status' => $statusAfterSubmit,
                    'draft_data' => null,
                    'draft_saved_at' => null,
                ]);
                $quote = $existing->fresh();
                if ($quote === null) {
                    throw new RuntimeException(__('rfqs.cannot_submit_quote_no_items'));
                }
                RfqQuoteItem::query()->where('rfq_quote_id', $quote->id)->delete();
            } else {
                $quote = RfqQuote::create([
                    'rfq_id' => $rfq->id,
                    'supplier_id' => $supplierId,
                    'submitted_at' => now(),
                    'status' => $statusAfterSubmit,
                    'draft_data' => null,
                    'draft_saved_at' => null,
                ]);
            }

            /** @var RfqQuote $quote */
            $items = [];
            $currency = $rfq->currency ?? 'SAR';
            $itemData = $data['items'] ?? [];

            foreach ($rfq->items as $item) {
                $row = $itemData[$item->id] ?? null;
                $resolved = RfqQuoteLineResolver::resolveForPersistence($item, is_array($row) ? $row : null);

                $notes = isset($row['notes']) && $row['notes'] !== '' ? (string) $row['notes'] : null;

                $items[] = [
                    'id' => (string) Str::uuid(),
                    'rfq_quote_id' => $quote->id,
                    'rfq_item_id' => $item->id,
                    'unit_price' => $resolved['unit_price'],
                    'total_price' => $resolved['total_price'],
                    'currency' => $currency,
                    'notes' => $notes,
                    'included_in_other' => $resolved['included_in_other'],
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
                'was_update' => $hadPriorSubmission,
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
