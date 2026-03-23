<?php

declare(strict_types=1);

namespace App\Application\Procurement\Services;

use App\Models\Rfq;
use App\Models\RfqQuote;
use App\Models\RfqQuoteItem;
use App\Models\RfqSupplier;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

final class SaveDraftRfqQuoteService
{
    /**
     * Persist supplier quote as draft (no submission / no tracker bump).
     *
     * @param array{supplier_id: string, items: array<string, array{unit_price?: float|string, included_in_other?: bool, notes?: string|null}>} $data
     */
    public function execute(Rfq $rfq, array $data, ?Model $actor = null): RfqQuote
    {
        return DB::transaction(function () use ($rfq, $data, $actor): RfqQuote {
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

            if ($existing !== null && in_array($existing->status, [RfqQuote::STATUS_SUBMITTED, RfqQuote::STATUS_REVISED], true)) {
                $existing->update([
                    'draft_data' => [
                        'items' => $data['items'],
                    ],
                    'draft_saved_at' => now(),
                ]);

                $rfq->activities()->create([
                    'activity_type' => 'draft_saved',
                    'description' => 'Quote draft saved.',
                    'metadata' => [
                        'supplier_id' => $supplierId,
                        'rfq_id' => $rfq->id,
                    ],
                    'user_id' => $actor instanceof User ? $actor->getKey() : null,
                    'actor_type' => $actor !== null ? $actor->getMorphClass() : null,
                    'actor_id' => $actor !== null ? (string) $actor->getKey() : null,
                ]);

                return $existing->fresh();
            }

            if ($existing === null) {
                $quote = RfqQuote::create([
                    'rfq_id' => $rfq->id,
                    'supplier_id' => $supplierId,
                    'submitted_at' => null,
                    'status' => RfqQuote::STATUS_DRAFT,
                    'draft_data' => null,
                    'draft_saved_at' => now(),
                ]);
            } else {
                $existing->update([
                    'status' => RfqQuote::STATUS_DRAFT,
                    'submitted_at' => null,
                    'draft_data' => null,
                    'draft_saved_at' => now(),
                ]);
                $quote = $existing->fresh();
            }

            RfqQuoteItem::query()->where('rfq_quote_id', $quote->id)->delete();

            $currency = $rfq->currency ?? 'SAR';
            $itemData = $data['items'] ?? [];
            $rows = [];

            foreach ($rfq->items as $item) {
                $row = $itemData[$item->id] ?? [];
                $resolved = RfqQuoteLineResolver::resolveForPersistence($item, $row !== [] ? $row : null);
                $notes = isset($row['notes']) && $row['notes'] !== '' ? (string) $row['notes'] : null;

                $rows[] = [
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

            RfqQuoteItem::insert($rows);

            $rfq->activities()->create([
                'activity_type' => 'draft_saved',
                'description' => 'Quote draft saved.',
                'metadata' => [
                    'supplier_id' => $supplierId,
                    'rfq_id' => $rfq->id,
                ],
                'user_id' => $actor instanceof User ? $actor->getKey() : null,
                'actor_type' => $actor !== null ? $actor->getMorphClass() : null,
                'actor_id' => $actor !== null ? (string) $actor->getKey() : null,
            ]);

            return $quote->fresh(['items']);
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
