<?php

declare(strict_types=1);

namespace App\Services\Procurement;

use App\Application\Procurement\Services\RfqQuoteLineResolver;
use App\Models\Rfq;
use App\Models\RfqQuote;
use App\Models\RfqSupplierQuote;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

/**
 * RFQ activities for supplier portal actions (audit + supplier timeline).
 */
final class SupplierRfqActivityLogger
{
    public const TYPE_RFQ_VIEWED = 'supplier_rfq_viewed';

    public const TYPE_QUOTE_DRAFT_SAVED = 'supplier_quote_draft_saved';

    public const TYPE_QUOTE_SUBMITTED = 'supplier_quote_submitted';

    public const TYPE_QUOTE_REVISED = 'supplier_quote_revised';

    public const TYPE_ATTACHMENT_UPLOADED = 'supplier_quote_attachment_uploaded';

    public const TYPE_ATTACHMENT_DELETED = 'supplier_quote_attachment_deleted';

    /**
     * First-time RFQ detail view (invitation viewed_at was null). Not logged on every refresh.
     */
    public function logRfqFirstViewed(Rfq $rfq, string $supplierId, ?Model $actor, ?Request $request): void
    {
        $rfq->activities()->create([
            'activity_type' => self::TYPE_RFQ_VIEWED,
            'description' => 'Supplier opened RFQ detail.',
            'metadata' => array_merge(
                $this->baseMetadata($rfq->id, $supplierId, $request),
                [
                    'event' => self::TYPE_RFQ_VIEWED,
                ]
            ),
            'user_id' => $actor instanceof User ? $actor->getKey() : null,
            'actor_type' => $actor !== null ? $actor->getMorphClass() : null,
            'actor_id' => $actor !== null ? (string) $actor->getKey() : null,
        ]);
    }

    public function logQuoteDraftSaved(Rfq $rfq, RfqQuote $quote, ?Model $actor, ?Request $request): void
    {
        $rfq->loadMissing('items');
        $quote->loadMissing('items');
        $summary = RfqQuoteLineResolver::summarize($rfq->items, null, $quote->items);

        $rfq->activities()->create([
            'activity_type' => self::TYPE_QUOTE_DRAFT_SAVED,
            'description' => 'Supplier saved quote draft.',
            'metadata' => array_merge(
                $this->baseMetadata($rfq->id, $quote->supplier_id, $request),
                $this->itemSummaryMetadata($summary),
                [
                    'event' => self::TYPE_QUOTE_DRAFT_SAVED,
                ]
            ),
            'user_id' => $actor instanceof User ? $actor->getKey() : null,
            'actor_type' => $actor !== null ? $actor->getMorphClass() : null,
            'actor_id' => $actor !== null ? (string) $actor->getKey() : null,
        ]);
    }

    /**
     * @param 'submitted'|'revised' $kind
     */
    public function logQuoteSubmittedOrRevised(
        Rfq $rfq,
        RfqSupplierQuote $tracker,
        RfqQuote $quote,
        string $kind,
        ?Model $actor,
        ?Request $request
    ): void {
        $rfq->loadMissing('items');
        $quote->loadMissing('items');
        $summary = RfqQuoteLineResolver::summarize($rfq->items, null, $quote->items);

        $type = $kind === 'revised' ? self::TYPE_QUOTE_REVISED : self::TYPE_QUOTE_SUBMITTED;

        $rfq->activities()->create([
            'activity_type' => $type,
            'description' => $kind === 'revised' ? 'Supplier revised quotation.' : 'Supplier submitted quotation.',
            'metadata' => array_merge(
                $this->baseMetadata($rfq->id, $quote->supplier_id, $request),
                $this->itemSummaryMetadata($summary),
                [
                    'event' => $type,
                    'quote_version' => (int) $tracker->revision_no,
                ]
            ),
            'user_id' => $actor instanceof User ? $actor->getKey() : null,
            'actor_type' => $actor !== null ? $actor->getMorphClass() : null,
            'actor_id' => $actor !== null ? (string) $actor->getKey() : null,
        ]);
    }

    public function logAttachmentUploaded(
        Rfq $rfq,
        string $supplierId,
        string $fileName,
        ?int $quoteVersion,
        ?Model $actor,
        ?Request $request
    ): void {
        $rfq->activities()->create([
            'activity_type' => self::TYPE_ATTACHMENT_UPLOADED,
            'description' => 'Supplier uploaded quote attachment.',
            'metadata' => array_merge(
                $this->baseMetadata($rfq->id, $supplierId, $request),
                [
                    'event' => self::TYPE_ATTACHMENT_UPLOADED,
                    'file_name' => $fileName,
                    'quote_version' => $quoteVersion,
                ]
            ),
            'user_id' => $actor instanceof User ? $actor->getKey() : null,
            'actor_type' => $actor !== null ? $actor->getMorphClass() : null,
            'actor_id' => $actor !== null ? (string) $actor->getKey() : null,
        ]);
    }

    public function logAttachmentDeleted(
        Rfq $rfq,
        string $supplierId,
        string $fileName,
        ?int $quoteVersion,
        ?Model $actor,
        ?Request $request
    ): void {
        $rfq->activities()->create([
            'activity_type' => self::TYPE_ATTACHMENT_DELETED,
            'description' => 'Supplier removed quote attachment.',
            'metadata' => array_merge(
                $this->baseMetadata($rfq->id, $supplierId, $request),
                [
                    'event' => self::TYPE_ATTACHMENT_DELETED,
                    'file_name' => $fileName,
                    'quote_version' => $quoteVersion,
                ]
            ),
            'user_id' => $actor instanceof User ? $actor->getKey() : null,
            'actor_type' => $actor !== null ? $actor->getMorphClass() : null,
            'actor_id' => $actor !== null ? (string) $actor->getKey() : null,
        ]);
    }

    /**
     * @param array{
     *     total_items: int,
     *     priced_items_count: int,
     *     included_items_count: int,
     *     unpriced_items_count: int,
     *     total_quotation_amount: float
     * } $summary
     *
     * @return array<string, float|int>
     */
    private function itemSummaryMetadata(array $summary): array
    {
        return [
            'priced_items_count' => $summary['priced_items_count'],
            'unpriced_items_count' => $summary['unpriced_items_count'],
            'included_items_count' => $summary['included_items_count'],
            'total_items' => $summary['total_items'],
            'total_quotation_amount' => $summary['total_quotation_amount'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function baseMetadata(string $rfqId, string $supplierId, ?Request $request): array
    {
        $meta = [
            'rfq_id' => $rfqId,
            'supplier_id' => $supplierId,
            'logged_at' => now()->toIso8601String(),
        ];

        if ($request !== null) {
            $meta['ip'] = $request->ip();
            $meta['user_agent'] = $request->userAgent();
        }

        return $meta;
    }
}
