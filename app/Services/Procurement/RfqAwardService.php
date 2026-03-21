<?php

declare(strict_types=1);

namespace App\Services\Procurement;

use App\Models\Rfq;
use App\Models\RfqAward;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use RuntimeException;

final class RfqAwardService
{
    public function __construct(
        private readonly RfqEventService $rfqEventService
    ) {}

    public function awardSupplier(
        Rfq $rfq,
        Supplier $supplier,
        User $actor,
        float $amount,
        string $currency,
        ?string $reason = null,
        ?string $rfqQuoteId = null
    ): RfqAward {
        return DB::transaction(function () use ($rfq, $supplier, $actor, $amount, $currency, $reason, $rfqQuoteId): RfqAward {
            $rfq = Rfq::where('id', $rfq->id)->lockForUpdate()->firstOrFail();
            if ($rfq->award()->exists()) {
                throw new RuntimeException('RFQ already has an award. Duplicate awards are not allowed.');
            }

            if ($rfq->status !== Rfq::STATUS_RECOMMENDED) {
                throw new RuntimeException('RFQ can only be awarded when status is recommended.');
            }

            $award = $rfq->award()->create([
                'supplier_id'     => $supplier->id,
                'awarded_by'      => $actor->id,
                'awarded_amount'  => $amount,
                'currency'        => $currency,
                'award_note'      => $reason,
                'quote_id'        => null,
                'rfq_quote_id'    => $rfqQuoteId,
            ]);

            $rfq->changeStatus(Rfq::STATUS_AWARDED, $actor);

            $rfq->activities()->create([
                'activity_type' => 'rfq_awarded',
                'description'   => 'RFQ awarded.',
                'metadata'      => [
                    'rfq_id'         => $rfq->id,
                    'supplier_id'    => $supplier->id,
                    'awarded_amount' => $amount,
                ],
                'user_id'    => $actor->id,
                'actor_type' => $actor->getMorphClass(),
                'actor_id'   => (string) $actor->getKey(),
            ]);

            $this->rfqEventService->rfqAwarded($rfq);

            return $award;
        });
    }
}
