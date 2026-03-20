<?php

declare(strict_types=1);

namespace App\Services\SupplierIntelligence;

use App\Models\RfqQuote;
use App\Models\RfqSupplier;
use App\Models\Supplier;
use Illuminate\Support\Facades\DB;

final class SupplierRiskScoreService
{
    private const MAX_SCORE = 100;

    private const WEIGHT_COMPLIANCE = 35;

    private const WEIGHT_STATUS = 25;

    private const WEIGHT_FINANCIAL = 20;

    private const WEIGHT_PERFORMANCE = 20;

    public function __construct(
        private readonly SupplierComplianceTracker $complianceTracker,
        private readonly SupplierFinancialCapacityService $financialCapacity,
    ) {}

    /**
     * Compute risk score 0–100 (higher = higher risk). Optionally persist to supplier.risk_score.
     */
    public function compute(Supplier $supplier, bool $persist = true): int
    {
        $compliance = $this->complianceTracker->getCompliance($supplier);
        $capacity = $this->financialCapacity->getCapacity($supplier);

        $complianceScore = $this->scoreCompliance($compliance);
        $statusScore = $this->scoreStatus($supplier);
        $financialScore = $this->scoreFinancial($capacity);
        $performanceScore = $this->scorePerformance($supplier);

        $total = (int) round(
            ($complianceScore * self::WEIGHT_COMPLIANCE / 100)
            + ($statusScore * self::WEIGHT_STATUS / 100)
            + ($financialScore * self::WEIGHT_FINANCIAL / 100)
            + ($performanceScore * self::WEIGHT_PERFORMANCE / 100)
        );
        $total = max(0, min(self::MAX_SCORE, $total));

        if ($persist) {
            Supplier::where('id', $supplier->id)->update(['risk_score' => $total]);
        }

        return $total;
    }

    /**
     * Map risk score (0–100) to level for UI and API.
     */
    public function getRiskLevel(int $score): string
    {
        if ($score >= 81) {
            return 'critical';
        }
        if ($score >= 61) {
            return 'high';
        }
        if ($score >= 31) {
            return 'medium';
        }
        return 'low';
    }

    private function scoreCompliance(array $compliance): int
    {
        if ($compliance['status'] === 'non_compliant') {
            return 100;
        }
        if ($compliance['status'] === 'expiring_soon') {
            return 50;
        }
        return 0;
    }

    private function scoreStatus(Supplier $supplier): int
    {
        if ($supplier->status === Supplier::STATUS_BLACKLISTED) {
            return 100;
        }
        if ($supplier->status === Supplier::STATUS_SUSPENDED) {
            return 80;
        }
        if (in_array($supplier->status, [Supplier::STATUS_REJECTED, Supplier::STATUS_MORE_INFO_REQUESTED], true)) {
            return 60;
        }
        return 0;
    }

    private function scoreFinancial(array $capacity): int
    {
        if ($capacity['status'] === 'over_capacity') {
            return 100;
        }
        if ($capacity['utilization_percent'] !== null && $capacity['utilization_percent'] >= 80) {
            return 60;
        }
        return 0;
    }

    private function scorePerformance(Supplier $supplier): int
    {
        $invited = RfqSupplier::where('supplier_id', $supplier->id)->where('status', '!=', 'removed')->count();
        if ($invited === 0) {
            return 0;
        }
        $submitted = RfqQuote::where('supplier_id', $supplier->id)->where('status', 'submitted')->count();
        $responseRate = ($submitted / $invited) * 100;
        if ($responseRate < 25) {
            return 70;
        }
        if ($responseRate < 50) {
            return 40;
        }
        return 0;
    }

    /**
     * Recompute and persist risk score for a single supplier.
     */
    public function recalculate(Supplier $supplier): int
    {
        return $this->compute($supplier, true);
    }

    /**
     * Recompute risk scores for all approved/active suppliers (e.g. scheduled job).
     *
     * @return array{processed: int, updated: int}
     */
    public function recalculateAll(): array
    {
        $suppliers = Supplier::whereIn('status', [Supplier::STATUS_APPROVED, Supplier::STATUS_SUSPENDED])->get();
        $processed = 0;
        $updated = 0;
        foreach ($suppliers as $supplier) {
            $before = $supplier->risk_score;
            $after = $this->compute($supplier, true);
            $processed++;
            if ($before !== $after) {
                $updated++;
            }
        }
        return ['processed' => $processed, 'updated' => $updated];
    }
}
