<?php

declare(strict_types=1);

namespace App\Services\Procurement;

use App\Application\Procurement\Services\RfqQuoteLineResolver;

/**
 * Derives comparison-ready summary fields from immutable snapshot item rows.
 *
 * Prefers `pricing_state`; legacy rows without it are inferred from `included_in_other`,
 * `is_priced`, or `unit_price`.
 */
final class RfqSupplierQuoteSnapshotComparisonHelper
{
    public const SNAPSHOT_SCHEMA_VERSION = 1;

    /**
     * @param list<array<string, mixed>> $itemRows
     * @return array{
     *     priced_items_count: int,
     *     included_items_count: int,
     *     unpriced_items_count: int,
     *     quoted_total_amount: float,
     *     has_partial_submission: bool,
     *     total_line_items: int,
     *     submission_completeness_percent: float
     * }
     */
    public static function deriveSummaryFromItemRows(array $itemRows): array
    {
        $priced = 0;
        $included = 0;
        $unpriced = 0;
        $quotedTotal = 0.0;

        foreach ($itemRows as $row) {
            $state = self::resolvePricingState($row);

            if ($state === RfqQuoteLineResolver::STATE_INCLUDED) {
                $included++;
            } elseif ($state === RfqQuoteLineResolver::STATE_UNPRICED) {
                $unpriced++;
            } elseif ($state === RfqQuoteLineResolver::STATE_PRICED) {
                $priced++;
                $tp = $row['total_price'] ?? null;
                if ($tp !== null && $tp !== '' && is_numeric($tp)) {
                    $quotedTotal += (float) $tp;
                }
            }
        }

        $totalLines = count($itemRows);
        $covered = $priced + $included;
        $completeness = $totalLines === 0
            ? 0.0
            : round(($covered / $totalLines) * 100, 2);

        return self::normalizeSubmissionSummaryQuotedTotal([
            'priced_items_count' => $priced,
            'included_items_count' => $included,
            'unpriced_items_count' => $unpriced,
            'quoted_total_amount' => (float) round($quotedTotal, 4),
            'has_partial_submission' => $unpriced > 0,
            'total_line_items' => $totalLines,
            'submission_completeness_percent' => (float) $completeness,
        ]);
    }

    /**
     * Ensures `quoted_total_amount` is always float (JSON decode may yield int for whole numbers).
     *
     * @param array<string, mixed> $submissionSummary
     * @return array<string, mixed>
     */
    public static function normalizeSubmissionSummaryQuotedTotal(array $submissionSummary): array
    {
        if (array_key_exists('quoted_total_amount', $submissionSummary)) {
            $submissionSummary['quoted_total_amount'] = (float) $submissionSummary['quoted_total_amount'];
        }
        if (array_key_exists('submission_completeness_percent', $submissionSummary)) {
            $submissionSummary['submission_completeness_percent'] = (float) $submissionSummary['submission_completeness_percent'];
        }

        return $submissionSummary;
    }

    /**
     * Normalizes comparison summary floats after loading snapshot JSON from storage.
     *
     * @param array<string, mixed> $snapshotData
     * @return array<string, mixed>
     */
    public static function normalizeSnapshotDataForRead(array $snapshotData): array
    {
        if (isset($snapshotData['submission_summary']) && is_array($snapshotData['submission_summary'])) {
            $snapshotData['submission_summary'] = self::normalizeSubmissionSummaryQuotedTotal($snapshotData['submission_summary']);
        }

        return $snapshotData;
    }

    /**
     * Ensures snapshot_data (possibly legacy) has a full `submission_summary` block.
     *
     * @param array<string, mixed> $snapshotData
     * @return array<string, mixed>
     */
    public static function ensureSubmissionSummary(array $snapshotData): array
    {
        $existing = $snapshotData['submission_summary'] ?? null;
        if (is_array($existing) && self::submissionSummaryIsComplete($existing)) {
            $snapshotData['comparison_schema_version'] = $snapshotData['comparison_schema_version'] ?? self::SNAPSHOT_SCHEMA_VERSION;
            $snapshotData['submission_summary'] = self::normalizeSubmissionSummaryQuotedTotal($existing);

            return $snapshotData;
        }

        $items = $snapshotData['items'] ?? [];
        if (! is_array($items)) {
            $items = [];
        }

        /** @var list<array<string, mixed>> $itemList */
        $itemList = array_values($items);
        $snapshotData['submission_summary'] = self::deriveSummaryFromItemRows($itemList);
        $snapshotData['comparison_schema_version'] = $snapshotData['comparison_schema_version'] ?? self::SNAPSHOT_SCHEMA_VERSION;

        return self::normalizeSnapshotDataForRead($snapshotData);
    }

    /**
     * @param array<string, mixed> $row
     */
    private static function resolvePricingState(array $row): string
    {
        if (isset($row['pricing_state']) && is_string($row['pricing_state']) && $row['pricing_state'] !== '') {
            return $row['pricing_state'];
        }

        if (! empty($row['included_in_other'])) {
            return RfqQuoteLineResolver::STATE_INCLUDED;
        }

        if (array_key_exists('is_priced', $row)) {
            return $row['is_priced'] ? RfqQuoteLineResolver::STATE_PRICED : RfqQuoteLineResolver::STATE_UNPRICED;
        }

        $up = $row['unit_price'] ?? null;
        if ($up === null || $up === '' || (is_string($up) && trim($up) === '')) {
            return RfqQuoteLineResolver::STATE_UNPRICED;
        }

        if (is_numeric($up)) {
            return RfqQuoteLineResolver::STATE_PRICED;
        }

        return RfqQuoteLineResolver::STATE_UNPRICED;
    }

    /**
     * @param array<string, mixed> $summary
     */
    private static function submissionSummaryIsComplete(array $summary): bool
    {
        $keys = [
            'priced_items_count',
            'included_items_count',
            'unpriced_items_count',
            'quoted_total_amount',
            'has_partial_submission',
            'total_line_items',
            'submission_completeness_percent',
        ];

        foreach ($keys as $k) {
            if (! array_key_exists($k, $summary)) {
                return false;
            }
        }

        return true;
    }
}
