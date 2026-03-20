<?php

declare(strict_types=1);

namespace App\Services\SupplierIntelligence;

use App\Models\RfqAward;
use App\Models\RfqQuote;
use App\Models\RfqSupplier;
use App\Models\Supplier;
use Illuminate\Support\Facades\Cache;

final class SupplierIntelligenceSnapshotService
{
    private const CACHE_TTL_MINUTES = 10;

    private const CACHE_KEY_PREFIX = 'supplier_intelligence_snapshot_';

    public function __construct(
        private readonly SupplierComplianceTracker $complianceTracker,
        private readonly SupplierFinancialCapacityService $financialCapacity,
        private readonly SupplierRiskScoreService $riskScoreService,
    ) {}

    /**
     * Build full snapshot (no cache). Used by getSnapshot and when cache is bypassed.
     *
     * @return array{
     *     risk_score: int,
     *     risk_level: string,
     *     compliance_status: string,
     *     compliance_score: int,
     *     capacity_utilization: ?float,
     *     ranking_score: float,
     *     response_rate: ?float,
     *     award_rate: ?float,
     *     rfq_invited_count: int,
     *     quotes_submitted_count: int,
     *     awards_count: int,
     *     declined_count: int,
     *     rfqs_participated: int,
     *     alerts: array<int, array{type: string, days_remaining?: int}>,
     * }
     */
    public function buildSnapshot(Supplier $supplier): array
    {
        $compliance = $this->complianceTracker->getCompliance($supplier);
        $capacity = $this->financialCapacity->getCapacity($supplier);
        $riskScore = $supplier->risk_score ?? $this->riskScoreService->compute($supplier, false);
        $riskLevel = $this->riskScoreService->getRiskLevel($riskScore);

        $invited = RfqSupplier::where('supplier_id', $supplier->id)->where('status', '!=', 'removed')->count();
        $submitted = RfqQuote::where('supplier_id', $supplier->id)->where('status', 'submitted')->count();
        $awards = RfqAward::where('supplier_id', $supplier->id)->count();
        $declined = RfqSupplier::where('supplier_id', $supplier->id)->where('status', 'declined')->count();

        $responseRate = $invited > 0 ? round(($submitted / $invited) * 100, 1) : null;
        $awardRate = $submitted > 0 ? round(($awards / $submitted) * 100, 1) : null;

        $performanceScore = 0.0;
        if ($responseRate !== null && $awardRate !== null) {
            $performanceScore = ($responseRate + $awardRate) / 2;
        } elseif ($responseRate !== null) {
            $performanceScore = $responseRate;
        } elseif ($awardRate !== null) {
            $performanceScore = $awardRate;
        } else {
            $performanceScore = 50.0;
        }

        $capacityScore = $capacity['utilization_percent'] !== null
            ? max(0, 100 - $capacity['utilization_percent'])
            : 50.0;
        $riskScoreInverse = 100 - $riskScore;
        $activityScore = min($invited / 20 * 100, 100);
        $complianceScore = $compliance['compliance_score'] ?? 0;

        $statusPenalty = match ($supplier->status) {
            Supplier::STATUS_APPROVED => 0,
            Supplier::STATUS_SUSPENDED => -20,
            Supplier::STATUS_BLACKLISTED => -100,
            default => -10,
        };

        $rankingScore = (float) round(
            ($performanceScore * 0.30)
            + ($complianceScore * 0.25)
            + ($capacityScore * 0.20)
            + ($riskScoreInverse * 0.15)
            + ($activityScore * 0.10)
            + $statusPenalty,
            1
        );

        return [
            'risk_score' => $riskScore,
            'risk_level' => $riskLevel,
            'compliance_status' => $compliance['status'],
            'compliance_score' => $complianceScore,
            'capacity_utilization' => $capacity['utilization_percent'],
            'ranking_score' => $rankingScore,
            'response_rate' => $responseRate,
            'award_rate' => $awardRate,
            'rfq_invited_count' => $invited,
            'quotes_submitted_count' => $submitted,
            'awards_count' => $awards,
            'declined_count' => $declined,
            'rfqs_participated' => $invited,
            'alerts' => $compliance['alerts'] ?? [],
        ];
    }

    /**
     * Get snapshot for supplier (cached 10 minutes).
     */
    public function getSnapshot(Supplier $supplier): array
    {
        $key = self::CACHE_KEY_PREFIX . $supplier->id;
        return Cache::remember(
            $key,
            now()->addMinutes(self::CACHE_TTL_MINUTES),
            fn () => $this->buildSnapshot($supplier)
        );
    }

    /**
     * Invalidate cached snapshot when supplier or related data changes.
     */
    public function invalidateSnapshot(Supplier $supplier): void
    {
        Cache::forget(self::CACHE_KEY_PREFIX . $supplier->id);
    }
}
