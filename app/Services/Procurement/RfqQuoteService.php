<?php

declare(strict_types=1);

namespace App\Services\Procurement;

use App\Models\Rfq;
use App\Models\RfqQuote;
use App\Models\RfqSupplierInvitation;
use App\Models\RfqSupplierQuote;
use App\Models\Supplier;
use Illuminate\Database\Eloquent\Model;

final class RfqQuoteService
{
    public function __construct(
        private readonly RfqSupplierQuoteSnapshotService $snapshotService,
    ) {}

    /**
     * Record quote submission: update invitation responded_at, upsert tracking record, create activity.
     * If RFQ status is issued, transition to responses_received.
     */
    public function recordSubmission(Rfq $rfq, Supplier $supplier, float $totalAmount = 0, ?Model $actor = null, ?RfqQuote $submittedQuote = null): RfqSupplierQuote
    {
        $invitation = RfqSupplierInvitation::query()->firstOrNew([
            'rfq_id' => $rfq->id,
            'supplier_id' => $supplier->id,
        ]);

        if (! $invitation->exists) {
            $invitation->invited_at = now();
        }

        $invitation->responded_at = now();
        $invitation->status = RfqSupplierInvitation::STATUS_RESPONDED;
        $invitation->save();

        $currency = $rfq->currency ?? 'SAR';
        $tracker = RfqSupplierQuote::query()
            ->where('rfq_id', $rfq->id)
            ->where('supplier_id', $supplier->id)
            ->first();

        if ($tracker) {
            $tracker->update([
                'submitted_at'  => now(),
                'revision_no'   => $tracker->revision_no + 1,
                'status'       => RfqSupplierQuote::STATUS_REVISED,
                'total_amount'  => $totalAmount,
                'currency'      => $currency,
            ]);
            $activityType = 'quote_revised';
        } else {
            $tracker = RfqSupplierQuote::create([
                'rfq_id'       => $rfq->id,
                'supplier_id'  => $supplier->id,
                'submitted_at' => now(),
                'revision_no'  => 1,
                'status'       => RfqSupplierQuote::STATUS_SUBMITTED,
                'total_amount' => $totalAmount,
                'currency'     => $currency,
            ]);
            $activityType = 'quote_submitted';
        }

        $rfq->activities()->create([
            'activity_type' => $activityType,
            'description'   => $activityType === 'quote_submitted' ? 'Quote submitted.' : 'Quote revised.',
            'metadata'      => [
                'supplier_id' => $supplier->id,
                'rfq_id'      => $rfq->id,
            ],
            'user_id'    => $actor instanceof \App\Models\User ? $actor->getKey() : null,
            'actor_type' => $actor !== null ? $actor->getMorphClass() : null,
            'actor_id'   => $actor !== null ? (string) $actor->getKey() : null,
        ]);

        if ($rfq->status === Rfq::STATUS_ISSUED) {
            $rfq->changeStatus(Rfq::STATUS_RESPONSES_RECEIVED, $actor);
        }

        app(\App\Services\Procurement\RfqEventService::class)->quoteSubmitted($tracker);

        $tracker = $tracker->fresh();
        if ($tracker === null) {
            throw new \RuntimeException('RfqSupplierQuote tracker missing after submission.');
        }

        $quote = $submittedQuote ?? RfqQuote::query()
            ->where('rfq_id', $rfq->id)
            ->where('supplier_id', $supplier->id)
            ->with(['items'])
            ->first();

        if ($quote !== null) {
            $rfq->loadMissing('items');
            $this->snapshotService->createSnapshotAndReassignMedia($rfq, $quote, $tracker);
        }

        return $tracker->fresh();
    }
}
