<?php

declare(strict_types=1);

namespace App\Services\Procurement;

use App\Models\RfqSupplierQuoteSnapshot;

/**
 * Read-side normalization for immutable supplier quote snapshots (comparison / evaluation prep).
 */
final class RfqSupplierQuoteComparisonReadModelService
{
    /**
     * Returns a single submitted version in a stable, comparison-ready shape.
     * Legacy snapshots without `submission_summary` are backfilled from `items` (not persisted).
     *
     * @return array<string, mixed>
     */
    public function normalizeForComparison(RfqSupplierQuoteSnapshot $snapshot): array
    {
        $data = $snapshot->snapshot_data;
        if (! is_array($data)) {
            return [];
        }

        $data = RfqSupplierQuoteSnapshotComparisonHelper::ensureSubmissionSummary($data);

        return [
            'snapshot_id' => $snapshot->id,
            'rfq_supplier_quote_id' => $snapshot->rfq_supplier_quote_id,
            'rfq_id' => $data['rfq_id'] ?? $snapshot->rfq_id,
            'supplier_id' => $data['supplier_id'] ?? $snapshot->supplier_id,
            'revision_no' => $data['revision_no'] ?? $snapshot->revision_no,
            'version_number' => $data['version_number'] ?? $snapshot->revision_no,
            'submitted_at' => $data['submitted_at'] ?? $snapshot->submitted_at?->toIso8601String(),
            'currency' => $data['currency'] ?? null,
            'comparison_schema_version' => (int) ($data['comparison_schema_version'] ?? RfqSupplierQuoteSnapshotComparisonHelper::SNAPSHOT_SCHEMA_VERSION),
            'snapshot_checksum' => $snapshot->snapshot_checksum,
            'submission_summary' => $data['submission_summary'] ?? [],
            'lines' => $data['items'] ?? [],
            'attachments' => $data['attachments'] ?? [],
        ];
    }
}
