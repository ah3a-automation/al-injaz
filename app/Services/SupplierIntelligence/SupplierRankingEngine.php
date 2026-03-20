<?php

declare(strict_types=1);

namespace App\Services\SupplierIntelligence;

use App\Models\RfqAward;
use App\Models\RfqQuote;
use App\Models\RfqSupplier;
use App\Models\Supplier;
use Illuminate\Support\Collection;

final class SupplierRankingEngine
{
    public function __construct(
        private readonly SupplierComplianceTracker $complianceTracker,
        private readonly SupplierFinancialCapacityService $financialCapacity,
    ) {}

    /**
     * Rank suppliers by composite score (higher = better).
     * Formula: 30% performance + 25% compliance + 20% capacity + 15% risk inverse + 10% activity.
     *
     * @return Collection<int, array{supplier: Supplier, rank: int, score: float, risk_score: ?int, risk_level: string, compliance_status: string, compliance_score: int, utilization_percent: ?float, response_rate: ?float, award_rate: ?float, rfq_invited_count: int, quotes_submitted_count: int, awards_count: int, declined_count: int}>
     */
    public function rank(Collection $suppliers): Collection
    {
        $scored = $suppliers->map(function (Supplier $supplier) {
            $compliance = $this->complianceTracker->getCompliance($supplier);
            $capacity = $this->financialCapacity->getCapacity($supplier);
            $invited = RfqSupplier::where('supplier_id', $supplier->id)->where('status', '!=', 'removed')->count();
            $submitted = RfqQuote::where('supplier_id', $supplier->id)->where('status', 'submitted')->count();
            $awards = RfqAward::where('supplier_id', $supplier->id)->count();
            $declined = RfqSupplier::where('supplier_id', $supplier->id)->where('status', 'declined')->count();
            $responseRate = $invited > 0 ? round(($submitted / $invited) * 100, 1) : null;
            $awardRate = $submitted > 0 ? round(($awards / $submitted) * 100, 1) : null;

            $score = $this->compositeScore(
                $supplier->risk_score,
                $compliance['compliance_score'] ?? 0,
                $compliance['status'],
                $capacity['utilization_percent'],
                $responseRate,
                $awardRate,
                $invited,
                $supplier->status
            );
            $riskLevel = $this->riskLevelForScore($supplier->risk_score);
            return [
                'supplier' => $supplier,
                'score' => $score,
                'risk_score' => $supplier->risk_score,
                'risk_level' => $riskLevel,
                'compliance_status' => $compliance['status'],
                'compliance_score' => $compliance['compliance_score'] ?? 0,
                'utilization_percent' => $capacity['utilization_percent'],
                'response_rate' => $responseRate,
                'award_rate' => $awardRate,
                'rfq_invited_count' => $invited,
                'quotes_submitted_count' => $submitted,
                'awards_count' => $awards,
                'declined_count' => $declined,
                'over_capacity' => $capacity['status'] === 'over_capacity',
            ];
        });

        $sorted = $scored->sortByDesc('score')->values();
        return $sorted->map(fn ($item, $index) => array_merge($item, ['rank' => $index + 1]));
    }

    private function riskLevelForScore(?int $riskScore): string
    {
        if ($riskScore === null) {
            return 'low';
        }
        if ($riskScore >= 81) {
            return 'critical';
        }
        if ($riskScore >= 61) {
            return 'high';
        }
        if ($riskScore >= 31) {
            return 'medium';
        }
        return 'low';
    }

    private function compositeScore(
        ?int $riskScore,
        int $complianceScore,
        string $complianceStatus,
        ?float $utilizationPercent,
        ?float $responseRate,
        ?float $awardRate,
        int $rfqInvitedCount,
        string $status
    ): float {
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

        $capacityScore = $utilizationPercent !== null
            ? max(0, 100 - $utilizationPercent)
            : 50.0;

        $riskScoreInverse = $riskScore !== null ? (100 - $riskScore) : 50;

        $activityScore = min($rfqInvitedCount / 20 * 100, 100);

        $statusPenalty = match ($status) {
            Supplier::STATUS_APPROVED => 0,
            Supplier::STATUS_SUSPENDED => -20,
            Supplier::STATUS_BLACKLISTED => -100,
            default => -10,
        };

        return (float) round(
            ($performanceScore * 0.30)
            + ($complianceScore * 0.25)
            + ($capacityScore * 0.20)
            + ($riskScoreInverse * 0.15)
            + ($activityScore * 0.10)
            + $statusPenalty,
            1
        );
    }
}
