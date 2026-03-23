<?php

declare(strict_types=1);

namespace Tests\Unit\Services\Procurement;

use App\Application\Procurement\Services\RfqQuoteLineResolver;
use App\Services\Procurement\RfqSupplierQuoteSnapshotComparisonHelper;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class RfqSupplierQuoteSnapshotComparisonHelperTest extends TestCase
{
    #[Test]
    public function derive_summary_counts_priced_lines_and_sums_totals(): void
    {
        $rows = [
            [
                'pricing_state' => RfqQuoteLineResolver::STATE_PRICED,
                'total_price' => '100.5',
            ],
            [
                'pricing_state' => RfqQuoteLineResolver::STATE_PRICED,
                'total_price' => '10',
            ],
        ];

        $s = RfqSupplierQuoteSnapshotComparisonHelper::deriveSummaryFromItemRows($rows);

        $this->assertSame(2, $s['priced_items_count']);
        $this->assertSame(0, $s['included_items_count']);
        $this->assertSame(0, $s['unpriced_items_count']);
        $this->assertSame(110.5, $s['quoted_total_amount']);
        $this->assertFalse($s['has_partial_submission']);
        $this->assertSame(2, $s['total_line_items']);
    }

    #[Test]
    public function derive_summary_handles_included_and_unpriced_partial_submission(): void
    {
        $rows = [
            [
                'pricing_state' => RfqQuoteLineResolver::STATE_INCLUDED,
                'total_price' => '0',
            ],
            [
                'pricing_state' => RfqQuoteLineResolver::STATE_UNPRICED,
                'total_price' => null,
            ],
        ];

        $s = RfqSupplierQuoteSnapshotComparisonHelper::deriveSummaryFromItemRows($rows);

        $this->assertSame(0, $s['priced_items_count']);
        $this->assertSame(1, $s['included_items_count']);
        $this->assertSame(1, $s['unpriced_items_count']);
        $this->assertSame(0.0, $s['quoted_total_amount']);
        $this->assertTrue($s['has_partial_submission']);
    }

    #[Test]
    public function derive_summary_infers_state_from_legacy_rows_without_pricing_state(): void
    {
        $rows = [
            [
                'included_in_other' => true,
                'unit_price' => null,
            ],
            [
                'included_in_other' => false,
                'is_priced' => true,
                'unit_price' => '5',
                'total_price' => '20',
            ],
        ];

        $s = RfqSupplierQuoteSnapshotComparisonHelper::deriveSummaryFromItemRows($rows);

        $this->assertSame(1, $s['priced_items_count']);
        $this->assertSame(1, $s['included_items_count']);
        $this->assertSame(0, $s['unpriced_items_count']);
        $this->assertSame(20.0, $s['quoted_total_amount']);
        $this->assertFalse($s['has_partial_submission']);
    }

    #[Test]
    public function ensure_submission_summary_backfills_legacy_snapshot_without_summary_block(): void
    {
        $legacy = [
            'rfq_id' => 'rfq-1',
            'items' => [
                [
                    'pricing_state' => RfqQuoteLineResolver::STATE_PRICED,
                    'total_price' => '15',
                ],
            ],
        ];

        $out = RfqSupplierQuoteSnapshotComparisonHelper::ensureSubmissionSummary($legacy);

        $this->assertArrayHasKey('submission_summary', $out);
        $this->assertSame(15.0, $out['submission_summary']['quoted_total_amount']);
        $this->assertSame(1, $out['submission_summary']['priced_items_count']);
        $this->assertSame(RfqSupplierQuoteSnapshotComparisonHelper::SNAPSHOT_SCHEMA_VERSION, $out['comparison_schema_version']);
    }

    #[Test]
    public function ensure_submission_summary_keeps_complete_existing_block(): void
    {
        $existing = [
            'priced_items_count' => 3,
            'included_items_count' => 0,
            'unpriced_items_count' => 0,
            'quoted_total_amount' => 99.0,
            'has_partial_submission' => false,
            'total_line_items' => 3,
        ];

        $data = [
            'submission_summary' => $existing,
            'items' => [
                ['pricing_state' => RfqQuoteLineResolver::STATE_UNPRICED],
            ],
        ];

        $out = RfqSupplierQuoteSnapshotComparisonHelper::ensureSubmissionSummary($data);

        $this->assertSame($existing, $out['submission_summary']);
    }
}
