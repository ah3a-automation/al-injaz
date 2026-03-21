<?php

declare(strict_types=1);

namespace App\Services\Procurement;

use App\Models\Rfq;
use App\Models\RfqQuote;
use App\Models\RfqSupplierQuote;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

final class RfqComparisonService
{
    /**
     * Build enterprise comparison dataset for an RFQ.
     *
     * @return array{rfq_id: string, items: array<int, array>, suppliers: array<int, array>, comparison: array<string, array<string, array>>}
     */
    public function buildComparison(Rfq $rfq): array
    {
        $rfq->load([
            'items' => fn ($q) => $q->orderBy('sort_order'),
            'rfqQuotes' => fn ($q) => $q->whereIn('status', [RfqQuote::STATUS_SUBMITTED, RfqQuote::STATUS_REVISED])->with([
                'supplier:id,legal_name_en,supplier_code',
                'items',
            ]),
            'rfqSupplierQuotes',
        ]);

        $items = $rfq->items;
        $submittedQuotes = $rfq->rfqQuotes;
        $trackerBySupplier = $rfq->rfqSupplierQuotes->keyBy('supplier_id');
        $suppliersByQuote = $submittedQuotes->pluck('supplier', 'id');

        $totalItems = $items->count();
        $rfqEstimatedCost = (float) $items->sum('estimated_cost');
        $currency = $rfq->currency ?? 'SAR';

        $itemsPayload = $items->map(fn ($item) => [
            'id' => $item->id,
            'code' => $item->code,
            'description_en' => $item->description_en,
            'unit' => $item->unit,
            'qty' => $item->qty,
            'estimated_cost' => (float) $item->estimated_cost,
        ])->values()->all();

        $comparison = [];
        $supplierRows = [];
        $supplierTotals = [];
        $supplierPricedCount = [];

        foreach ($submittedQuotes as $quote) {
            $quoteItems = $quote->items;
            foreach ($quoteItems as $qi) {
                $itemId = $qi->rfq_item_id;
                $supplierId = $quote->supplier_id;
                if (! isset($comparison[$itemId])) {
                    $comparison[$itemId] = [];
                }
                $comparison[$itemId][$supplierId] = [
                    'unit_price' => (float) $qi->unit_price,
                    'total_price' => (float) $qi->total_price,
                ];
            }
        }

        foreach ($submittedQuotes as $quote) {
            $supplierId = $quote->supplier_id;
            $quoteItems = $quote->items;
            $tracker = $trackerBySupplier->get($supplierId);
            $totalQuote = (float) $quoteItems->sum('total_price');
            $pricedCount = $quoteItems->count();
            $completeness = $this->calculateCompletenessFromCounts($pricedCount, $totalItems);
            $deviation = $this->calculateDeviation($totalQuote, $rfqEstimatedCost);
            $submittedAt = $tracker?->submitted_at ?? $quote->submitted_at;
            $revisionCount = $tracker ? (int) $tracker->revision_no : 1;

            $supplierTotals[$supplierId] = $totalQuote;
            $supplierPricedCount[$supplierId] = $pricedCount;

            $supplier = $suppliersByQuote->get($quote->id);
            $supplierName = $supplier
                ? ($supplier->legal_name_en ?? $supplier->supplier_code ?? (string) $supplierId)
                : (string) $supplierId;
            $supplierRows[] = [
                'supplier_id' => $supplierId,
                'supplier_name' => $supplierName,
                'total_quote' => $totalQuote,
                'currency' => $currency,
                'deviation_from_estimate' => $deviation,
                'completeness_percent' => $completeness,
                'quote_status' => $quote->status,
                'submission_time' => $submittedAt?->toIso8601String(),
                'revision_count' => $revisionCount,
            ];
        }

        $this->assignRanks($supplierRows, $supplierTotals, $submittedQuotes, $trackerBySupplier);

        $this->maybeRecordComparisonGenerated($rfq, count($supplierRows));

        return [
            'rfq_id' => $rfq->id,
            'items' => $itemsPayload,
            'suppliers' => $supplierRows,
            'comparison' => $comparison,
        ];
    }

    /**
     * Build comparison data for RFQ Show page (comparison tab).
     * Returns format expected by Rfqs/Show.tsx.
     *
     * @return array{comparison: array, comparison_quotes_matrix: array, comparison_suppliers: array, comparison_summary: array}
     */
    public function buildShowComparisonData(Rfq $rfq): array
    {
        $rfq->load([
            'items' => fn ($q) => $q->orderBy('sort_order'),
            'suppliers',
            'rfqQuotes' => fn ($q) => $q
                ->whereIn('status', [RfqQuote::STATUS_SUBMITTED, RfqQuote::STATUS_REVISED])
                ->with(['supplier:id,legal_name_en,supplier_code', 'items']),
        ]);

        $submittedRfqQuotes = $rfq->rfqQuotes;
        $quoteIds = $submittedRfqQuotes->pluck('id')->all();

        $comparison = [];
        $quotesMatrix = [];
        $supplierTotals = [];

        if ($quoteIds !== []) {
            $rows = DB::table('rfq_quote_items')
                ->join('rfq_quotes', 'rfq_quotes.id', '=', 'rfq_quote_items.rfq_quote_id')
                ->whereIn('rfq_quote_items.rfq_quote_id', $quoteIds)
                ->select('rfq_quote_items.rfq_item_id', 'rfq_quotes.supplier_id', 'rfq_quote_items.unit_price', 'rfq_quote_items.total_price')
                ->orderBy('rfq_quote_items.rfq_item_id')
                ->orderBy('rfq_quotes.supplier_id')
                ->get();

            foreach ($rows as $row) {
                $itemId = $row->rfq_item_id;
                $supplierId = $row->supplier_id;
                $unitPrice = (string) $row->unit_price;
                $totalPrice = (string) $row->total_price;

                if (! isset($comparison[$itemId])) {
                    $comparison[$itemId] = [];
                    $quotesMatrix[$itemId] = [];
                }
                $comparison[$itemId][$supplierId] = [
                    'unit_price'  => $unitPrice,
                    'total_price' => $totalPrice,
                    'version_no'  => null,
                ];
                $quotesMatrix[$itemId][$supplierId] = [
                    'unit_price'  => $unitPrice,
                    'total_price' => $totalPrice,
                ];
                $supplierTotals[$supplierId] = ($supplierTotals[$supplierId] ?? 0) + (float) $row->total_price;
            }
        }

        $totalRfqItems = $rfq->items->count();
        $totalEstimatedCost = (float) $rfq->items->sum('estimated_cost');
        $supplierPricedCount = [];
        foreach ($submittedRfqQuotes as $q) {
            $supplierPricedCount[$q->supplier_id] = $q->items->count();
        }

        $comparisonSuppliers = $submittedRfqQuotes->map(function ($q) use ($totalRfqItems, $supplierPricedCount, $supplierTotals, $totalEstimatedCost) {
            $pricedItems = $supplierPricedCount[$q->supplier_id] ?? 0;
            $completenessPct = $totalRfqItems > 0 ? round(($pricedItems / $totalRfqItems) * 100, 1) : 0.0;
            $supplierTotal = $supplierTotals[$q->supplier_id] ?? 0;
            $variancePct = $totalEstimatedCost > 0
                ? round((($supplierTotal - $totalEstimatedCost) / $totalEstimatedCost) * 100, 1)
                : null;

            return [
                'id'               => $q->supplier_id,
                'rfq_quote_id'     => $q->id,
                'legal_name_en'    => $q->supplier->legal_name_en ?? '',
                'supplier_code'    => $q->supplier->supplier_code ?? '',
                'total_rfq_items'  => $totalRfqItems,
                'priced_items'     => $pricedItems,
                'completeness_pct' => $completenessPct,
                'variance_pct'     => $variancePct,
            ];
        })->unique('id')->values()->all();

        $lowestSupplierId = $supplierTotals ? (string) array_search(min($supplierTotals), $supplierTotals, true) : null;
        $highestSupplierId = $supplierTotals ? (string) array_search(max($supplierTotals), $supplierTotals, true) : null;
        $eligibleForRecommendation = array_filter($comparisonSuppliers, fn ($s) => ($s['completeness_pct'] ?? 0) >= 100);
        $eligibleSupplierIds = array_column($eligibleForRecommendation, 'id');
        $recommendedSupplierIds = [];
        if ($eligibleSupplierIds !== []) {
            $totalsEligible = array_intersect_key($supplierTotals, array_flip($eligibleSupplierIds));
            $minTotalAmongEligible = $totalsEligible !== [] ? min($totalsEligible) : null;
            if ($minTotalAmongEligible !== null) {
                $recommendedSupplierIds = array_keys(array_filter($totalsEligible, fn ($t) => abs($t - $minTotalAmongEligible) < 0.01));
            }
        }

        $comparisonSummary = [
            'suppliers_invited'         => $rfq->suppliers->count(),
            'suppliers_responded'        => count($comparisonSuppliers),
            'lowest_total_supplier_id'   => $lowestSupplierId,
            'highest_total_supplier_id'  => $highestSupplierId,
            'supplier_totals'            => $supplierTotals,
            'total_estimated_cost'       => $totalEstimatedCost,
            'total_rfq_items'            => $totalRfqItems,
            'recommended_supplier_ids'   => $recommendedSupplierIds,
            'is_tie'                     => count($recommendedSupplierIds) > 1,
        ];

        return [
            'comparison'             => $comparison,
            'comparison_quotes_matrix' => $quotesMatrix,
            'comparison_suppliers'   => $comparisonSuppliers,
            'comparison_summary'     => $comparisonSummary,
        ];
    }

    /**
     * Completeness = (number of priced items / total RFQ items) * 100.
     */
    public function calculateCompleteness(RfqSupplierQuote $quote): float
    {
        $quote->loadMissing('rfq.items');
        $rfq = $quote->rfq;
        $totalItems = $rfq->items->count();
        if ($totalItems === 0) {
            return 0.0;
        }
        $rfqQuote = RfqQuote::where('rfq_id', $quote->rfq_id)
            ->where('supplier_id', $quote->supplier_id)
            ->whereIn('status', [RfqQuote::STATUS_SUBMITTED, RfqQuote::STATUS_REVISED])
            ->withCount('items')
            ->first();
        $pricedCount = $rfqQuote ? $rfqQuote->items_count : 0;
        return $this->calculateCompletenessFromCounts($pricedCount, $totalItems);
    }

    /**
     * Deviation = (total_quote - rfq_estimated_cost) / rfq_estimated_cost * 100.
     * Positive = above estimate, negative = below estimate.
     */
    public function calculateDeviation(float $totalQuote, float $rfqEstimatedCost): ?float
    {
        if ($rfqEstimatedCost <= 0) {
            return null;
        }
        return round((($totalQuote - $rfqEstimatedCost) / $rfqEstimatedCost) * 100, 2);
    }

    private function calculateCompletenessFromCounts(int $pricedCount, int $totalItems): float
    {
        if ($totalItems === 0) {
            return 0.0;
        }
        return round(($pricedCount / $totalItems) * 100, 2);
    }

    /**
     * @param  array<int, array<string, mixed>>  $supplierRows
     * @param  array<string, float>  $supplierTotals
     * @param  Collection<int, RfqQuote>  $submittedQuotes
     * @param  Collection<string, RfqSupplierQuote>  $trackerBySupplier
     */
    private function assignRanks(
        array &$supplierRows,
        array $supplierTotals,
        Collection $submittedQuotes,
        Collection $trackerBySupplier
    ): void {
        $byPrice = collect($supplierTotals)->sort()->keys()->values()->all();
        $bySubmission = $submittedQuotes->sortBy(function (RfqQuote $q) use ($trackerBySupplier) {
            $t = $trackerBySupplier->get($q->supplier_id);
            $at = $t?->submitted_at ?? $q->submitted_at;
            return $at ? $at->format('Y-m-d H:i:s') : '9999-12-31';
        })->pluck('supplier_id')->values()->all();

        $priceRankMap = [];
        foreach ($byPrice as $i => $sid) {
            $priceRankMap[$sid] = $i + 1;
        }
        $submissionRankMap = [];
        foreach ($bySubmission as $i => $sid) {
            $submissionRankMap[$sid] = $i + 1;
        }
        $quoteRankMap = $priceRankMap;

        foreach ($supplierRows as &$row) {
            $sid = $row['supplier_id'];
            $row['price_rank'] = $priceRankMap[$sid] ?? null;
            $row['submission_rank'] = $submissionRankMap[$sid] ?? null;
            $row['quote_rank'] = $quoteRankMap[$sid] ?? null;
        }
    }

    private function maybeRecordComparisonGenerated(Rfq $rfq, int $supplierCount): void
    {
        $exists = $rfq->activities()
            ->where('activity_type', 'rfq_comparison_generated')
            ->exists();
        if ($exists) {
            return;
        }
        $rfq->activities()->create([
            'activity_type' => 'rfq_comparison_generated',
            'description' => 'Comparison matrix generated.',
            'metadata' => [
                'rfq_id' => $rfq->id,
                'supplier_count' => $supplierCount,
            ],
        ]);
    }
}
