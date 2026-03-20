<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Supplier;
use App\Services\SupplierIntelligence\SupplierComplianceTracker;
use App\Services\SupplierIntelligence\SupplierFinancialCapacityService;
use App\Services\SupplierIntelligence\SupplierIntelligenceSnapshotService;
use App\Services\SupplierIntelligence\SupplierRankingEngine;
use App\Services\SupplierIntelligence\SupplierRankingScoreService;
use App\Services\SupplierIntelligence\SupplierRiskScoreService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

final class SupplierIntelligenceController extends Controller
{
    public function __construct(
        private readonly SupplierComplianceTracker $complianceTracker,
        private readonly SupplierFinancialCapacityService $financialCapacity,
        private readonly SupplierRankingEngine $rankingEngine,
        private readonly SupplierRankingScoreService $rankingScoreService,
        private readonly SupplierRiskScoreService $riskScoreService,
        private readonly SupplierIntelligenceSnapshotService $snapshotService,
    ) {}

    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Supplier::class);

        $filter = (string) $request->input('filter', 'all');
        $statuses = [Supplier::STATUS_APPROVED, Supplier::STATUS_SUSPENDED];
        if ($filter === 'blacklisted') {
            $statuses[] = Supplier::STATUS_BLACKLISTED;
        }

        $query = Supplier::with(['categories:id,name_en,name_ar,code', 'certifications:id,name'])
            ->whereIn('status', $statuses)
            ->orderBy('legal_name_en');

        $query = match ($filter) {
            'high_risk' => $query->where('risk_score', '>=', 61),
            'suspended' => $query->where('status', Supplier::STATUS_SUSPENDED),
            'blacklisted' => $query->where('status', Supplier::STATUS_BLACKLISTED),
            default => $query,
        };

        $suppliersPaginator = $query->paginate(50)->withQueryString();
        $ranked = $this->rankingEngine->rank(collect($suppliersPaginator->items()));

        $filtered = collect($ranked)->filter(function ($item) use ($filter) {
            return match ($filter) {
                'high_risk' => ($item['risk_score'] ?? 0) >= 61,
                'non_compliant' => ($item['compliance_status'] ?? '') === 'non_compliant',
                'over_capacity' => ($item['over_capacity'] ?? false) === true,
                'suspended' => $item['supplier']->status === Supplier::STATUS_SUSPENDED,
                'blacklisted' => $item['supplier']->status === Supplier::STATUS_BLACKLISTED,
                default => true,
            };
        })->values();

        $summaryQuery = Supplier::whereIn('status', $statuses);
        $summary = [
            'total_suppliers' => (clone $summaryQuery)->count(),
            'high_risk_count' => (clone $summaryQuery)->where('risk_score', '>=', 61)->count(),
            'expiring_soon_count' => 0,
            'over_capacity_count' => 0,
        ];

        $watchlistIds = $request->user()
            ->watchlistedSuppliers()
            ->pluck('suppliers.id')
            ->all();

        $items = $filtered->map(function ($item, $index) use ($watchlistIds) {
            $supplier = $item['supplier'];
            return [
                'id' => $supplier->id,
                'supplier_code' => $supplier->supplier_code,
                'legal_name_en' => $supplier->legal_name_en,
                'status' => $supplier->status,
                'rank' => $index + 1,
                'score' => round($item['score'], 1),
                'ranking_score' => $supplier->ranking_score !== null ? (float) $supplier->ranking_score : null,
                'ranking_tier' => $supplier->ranking_tier,
                'risk_score' => $item['risk_score'],
                'risk_level' => $item['risk_level'] ?? 'low',
                'compliance_status' => $item['compliance_status'],
                'compliance_score' => $item['compliance_score'] ?? 0,
                'utilization_percent' => $item['utilization_percent'],
                'response_rate' => $item['response_rate'],
                'award_rate' => $item['award_rate'],
                'on_watchlist' => in_array($supplier->id, $watchlistIds, true),
            ];
        })->values()->all();

        return Inertia::render('SupplierIntelligence/Index', [
            'suppliers' => $items,
            'suppliersPaginator' => [
                'current_page' => $suppliersPaginator->currentPage(),
                'last_page' => $suppliersPaginator->lastPage(),
                'per_page' => $suppliersPaginator->perPage(),
                'total' => $suppliersPaginator->total(),
                'path' => $suppliersPaginator->path(),
            ],
            'summary' => $summary,
            'filter' => $filter,
            'can' => [
                'recalculate' => $request->user()->can('suppliers.approve'),
                'recalculate_ranking' => $request->user()->can('suppliers.approve'),
            ],
        ]);
    }

    public function show(Request $request, Supplier $supplier): Response
    {
        $this->authorize('view', $supplier);

        $snapshot = $this->snapshotService->getSnapshot($supplier);
        $compliance = $this->complianceTracker->getCompliance($supplier);
        $capacity = $this->financialCapacity->getCapacity($supplier);
        $ranking = $this->rankingScoreService->score($supplier);

        $topFactors = collect($ranking['factors'])
            ->sortByDesc('impact')
            ->take(5)
            ->values()
            ->all();

        $onWatchlist = $request->user()->watchlistedSuppliers()->where('suppliers.id', $supplier->id)->exists();

        return Inertia::render('SupplierIntelligence/Show', [
            'supplier' => [
                'id' => $supplier->id,
                'supplier_code' => $supplier->supplier_code,
                'legal_name_en' => $supplier->legal_name_en,
                'status' => $supplier->status,
                'risk_score' => $snapshot['risk_score'],
                'risk_level' => $snapshot['risk_level'],
                'compliance_score' => $snapshot['compliance_score'],
                'ranking_score' => $ranking['score'],
                'ranking_tier' => $ranking['tier'],
                'ranking_factors' => $topFactors,
                'suspension_reason' => $supplier->suspension_reason,
                'blacklist_reason' => $supplier->blacklist_reason,
            ],
            'compliance' => $compliance,
            'capacity' => $capacity,
            'alerts' => $snapshot['alerts'] ?? [],
            'on_watchlist' => $onWatchlist,
            'can' => [
                'recalculate_ranking' => $request->user()->can('suppliers.approve'),
            ],
        ]);
    }

    public function recalculateRisk(Request $request, Supplier $supplier): RedirectResponse
    {
        $this->authorize('update', $supplier);
        if (! $request->user()->can('suppliers.approve')) {
            abort(403);
        }

        $this->riskScoreService->recalculate($supplier);
        $this->snapshotService->invalidateSnapshot($supplier);

        return redirect()->route('supplier-intelligence.show', $supplier)
            ->with('success', 'Risk score recalculated.');
    }

    public function recalculateAll(Request $request): RedirectResponse
    {
        if (! $request->user()->can('suppliers.approve')) {
            abort(403);
        }

        $result = $this->riskScoreService->recalculateAll();

        return redirect()->route('supplier-intelligence.index')
            ->with('success', "Risk scores recalculated: {$result['processed']} processed, {$result['updated']} updated.");
    }

    public function recalculateRanking(Request $request, Supplier $supplier): RedirectResponse
    {
        $this->authorize('update', $supplier);
        if (! $request->user()->can('suppliers.approve')) {
            abort(403);
        }

        $this->rankingScoreService->recalculate($supplier);
        $this->snapshotService->invalidateSnapshot($supplier);

        return redirect()->route('supplier-intelligence.show', $supplier)
            ->with('success', 'Ranking score recalculated.');
    }

    public function recalculateAllRanking(Request $request): RedirectResponse
    {
        if (! $request->user()->can('suppliers.approve')) {
            abort(403);
        }

        $result = $this->rankingScoreService->recalculateAll();

        return redirect()->route('supplier-intelligence.index')
            ->with('success', "Ranking scores recalculated: {$result['processed']} processed, {$result['updated']} updated.");
    }
}
