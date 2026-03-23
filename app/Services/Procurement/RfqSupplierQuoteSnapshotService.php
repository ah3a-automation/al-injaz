<?php

declare(strict_types=1);

namespace App\Services\Procurement;

use App\Models\Rfq;
use App\Models\RfqQuote;
use App\Models\RfqSupplierQuote;
use App\Models\RfqSupplierQuoteSnapshot;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

final class RfqSupplierQuoteSnapshotService
{
    /**
     * Immutable snapshot row + move draft media from RfqQuote to this version.
     *
     * @return array<string, mixed>
     */
    public function buildSnapshotPayload(Rfq $rfq, RfqQuote $quote, RfqSupplierQuote $tracker, array $attachmentMetadata): array
    {
        $currency = $rfq->currency ?? 'SAR';
        $items = [];

        foreach ($rfq->items as $rfqItem) {
            $line = $quote->items->firstWhere('rfq_item_id', $rfqItem->id);
            $included = $line !== null && (bool) $line->included_in_other;
            $unitPrice = $line !== null ? (float) $line->unit_price : 0.0;
            $totalPrice = $line !== null ? (float) $line->total_price : 0.0;
            $isPriced = ! $included && $unitPrice >= 0.01;

            $items[] = [
                'rfq_item_id' => $rfqItem->id,
                'code' => $rfqItem->code,
                'description' => $rfqItem->description_en,
                'description_ar' => $rfqItem->description_ar,
                'qty' => $rfqItem->qty !== null ? (string) $rfqItem->qty : null,
                'unit' => $rfqItem->unit,
                'estimated_cost' => $rfqItem->estimated_cost !== null ? (string) $rfqItem->estimated_cost : null,
                'unit_price' => (string) $unitPrice,
                'total_price' => (string) $totalPrice,
                'included_in_other' => $included,
                'remark' => $line?->notes,
                'is_priced' => $isPriced,
            ];
        }

        return [
            'rfq_id' => $rfq->id,
            'supplier_id' => $quote->supplier_id,
            'version_number' => (int) $tracker->revision_no,
            'submitted_at' => $tracker->submitted_at?->toIso8601String(),
            'currency' => $currency,
            'items' => $items,
            'attachments' => $attachmentMetadata,
        ];
    }

    /**
     * @return array<int, array{id: int, name: string, file_name: string, size: int, mime_type: string|null}>
     */
    public function collectAttachmentMetadata(RfqQuote $quote): array
    {
        $out = [];
        foreach ($quote->getMedia('attachments') as $media) {
            $out[] = [
                'id' => (int) $media->id,
                'name' => $media->name,
                'file_name' => $media->file_name,
                'size' => (int) $media->size,
                'mime_type' => $media->mime_type,
            ];
        }

        return $out;
    }

    public function createSnapshotAndReassignMedia(Rfq $rfq, RfqQuote $quote, RfqSupplierQuote $tracker): RfqSupplierQuoteSnapshot
    {
        $rfq->loadMissing('items');
        $quote->loadMissing('items');

        $attachmentMeta = $this->collectAttachmentMetadata($quote);
        $payload = $this->buildSnapshotPayload($rfq, $quote, $tracker, $attachmentMeta);

        $snapshot = RfqSupplierQuoteSnapshot::query()->create([
            'rfq_supplier_quote_id' => $tracker->id,
            'rfq_id' => $rfq->id,
            'supplier_id' => $quote->supplier_id,
            'revision_no' => (int) $tracker->revision_no,
            'snapshot_data' => $payload,
            'submitted_at' => $tracker->submitted_at ?? now(),
            'created_at' => now(),
        ]);

        $snapshotClass = $snapshot->getMorphClass();
        $snapshotKey = $snapshot->getKey();

        Media::query()
            ->where('model_type', $quote->getMorphClass())
            ->where('model_id', $quote->id)
            ->where('collection_name', 'attachments')
            ->update([
                'model_type' => $snapshotClass,
                'model_id' => (string) $snapshotKey,
            ]);

        $tracker->update([
            'snapshot_data' => $payload,
        ]);

        return $snapshot->fresh();
    }
}
