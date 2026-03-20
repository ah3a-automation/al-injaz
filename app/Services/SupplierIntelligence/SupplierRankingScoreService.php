<?php

declare(strict_types=1);

namespace App\Services\SupplierIntelligence;

use App\Models\RfqAward;
use App\Models\RfqQuote;
use App\Models\RfqSupplier;
use App\Models\Supplier;

final class SupplierRankingScoreService
{
    public const TIER_PREFERRED = 'preferred';

    public const TIER_APPROVED = 'approved';

    public const TIER_WATCHLIST = 'watchlist';

    public const TIER_RESTRICTED = 'restricted';

    private const WEIGHT_RESPONSE_RATE = 20;

    private const WEIGHT_AWARD_RATE = 15;

    private const WEIGHT_COMPLIANCE = 25;

    private const WEIGHT_RISK_INVERSE = 15;

    private const WEIGHT_FINANCIAL_HEADROOM = 10;

    private const WEIGHT_QUOTE_COMPETITIVENESS = 15;

    private const THRESHOLD_PREFERRED = 90;

    private const THRESHOLD_APPROVED = 75;

    private const THRESHOLD_WATCHLIST = 50;

    private const PENALTY_SUSPENDED = 30;

    private const PENALTY_BLACKLISTED = 100;

    public function __construct(
        private readonly SupplierComplianceTracker $complianceTracker,
        private readonly SupplierFinancialCapacityService $financialCapacity,
    ) {}

    /**
     * Compute transparent 0–100 ranking score with factor breakdown.
     *
     * @return array{
     *     score: float,
     *     factors: array<int, array{key: string, label: string, value: float, weight: int, impact: float}>,
     *     tier: string,
     * }
     */
    public function score(Supplier $supplier): array
    {
        $compliance = $this->complianceTracker->getCompliance($supplier);
        $capacity = $this->financialCapacity->getCapacity($supplier);

        $invited = RfqSupplier::where('supplier_id', $supplier->id)->where('status', '!=', 'removed')->count();
        $submitted = RfqQuote::where('supplier_id', $supplier->id)->where('status', RfqQuote::STATUS_SUBMITTED)->count();
        $awards = RfqAward::where('supplier_id', $supplier->id)->count();

        $responseRate = $invited > 0 ? ($submitted / $invited) * 100 : null;
        $awardRate = $submitted > 0 ? ($awards / $submitted) * 100 : null;
        $quoteCompetitiveness = $invited > 0 ? ($awards / $invited) * 100 : null;

        $complianceScore = (float) ($compliance['compliance_score'] ?? 0);
        $riskScore = $supplier->risk_score;
        $riskInverse = $riskScore !== null ? (100 - min(100, max(0, $riskScore))) : 50.0;
        $financialHeadroom = $capacity['utilization_percent'] !== null
            ? max(0, 100 - $capacity['utilization_percent'])
            : 50.0;

        $factors = [];

        $responseRateValue = $responseRate ?? 50.0;
        $factors[] = [
            'key'    => 'response_rate',
            'label'  => 'Response Rate',
            'value'  => round($responseRateValue, 1),
            'weight' => self::WEIGHT_RESPONSE_RATE,
            'impact' => round(($responseRateValue / 100) * self::WEIGHT_RESPONSE_RATE, 1),
        ];

        $awardRateValue = $awardRate ?? 50.0;
        $factors[] = [
            'key'    => 'award_rate',
            'label'  => 'Award Rate',
            'value'  => round($awardRateValue, 1),
            'weight' => self::WEIGHT_AWARD_RATE,
            'impact' => round(($awardRateValue / 100) * self::WEIGHT_AWARD_RATE, 1),
        ];

        $factors[] = [
            'key'    => 'compliance_score',
            'label'  => 'Compliance',
            'value'  => $complianceScore,
            'weight' => self::WEIGHT_COMPLIANCE,
            'impact' => round(($complianceScore / 100) * self::WEIGHT_COMPLIANCE, 1),
        ];

        $factors[] = [
            'key'    => 'risk_inverse',
            'label'  => 'Risk (inverse)',
            'value'  => round($riskInverse, 1),
            'weight' => self::WEIGHT_RISK_INVERSE,
            'impact' => round(($riskInverse / 100) * self::WEIGHT_RISK_INVERSE, 1),
        ];

        $factors[] = [
            'key'    => 'financial_headroom',
            'label'  => 'Financial Headroom',
            'value'  => round($financialHeadroom, 1),
            'weight' => self::WEIGHT_FINANCIAL_HEADROOM,
            'impact' => round(($financialHeadroom / 100) * self::WEIGHT_FINANCIAL_HEADROOM, 1),
        ];

        $competitivenessValue = $quoteCompetitiveness ?? 50.0;
        $factors[] = [
            'key'    => 'quote_competitiveness',
            'label'  => 'Quote Competitiveness',
            'value'  => round($competitivenessValue, 1),
            'weight' => self::WEIGHT_QUOTE_COMPETITIVENESS,
            'impact' => round(($competitivenessValue / 100) * self::WEIGHT_QUOTE_COMPETITIVENESS, 1),
        ];

        $baseScore = (float) array_sum(array_column($factors, 'impact'));
        $score = max(0.0, min(100.0, round($baseScore, 1)));

        if ($supplier->status === Supplier::STATUS_SUSPENDED) {
            $score = max(0.0, round($score - self::PENALTY_SUSPENDED, 1));
            $factors[] = [
                'key'    => 'suspension_penalty',
                'label'  => 'Suspension penalty',
                'value'  => -(float) self::PENALTY_SUSPENDED,
                'weight' => 0,
                'impact' => -(float) self::PENALTY_SUSPENDED,
            ];
        }

        if ($supplier->status === Supplier::STATUS_BLACKLISTED) {
            $score = max(0.0, round($score - self::PENALTY_BLACKLISTED, 1));
            $score = min($score, 50.0);
            $factors[] = [
                'key'    => 'blacklist_penalty',
                'label'  => 'Blacklist penalty',
                'value'  => -(float) self::PENALTY_BLACKLISTED,
                'weight' => 0,
                'impact' => -(float) self::PENALTY_BLACKLISTED,
            ];
            $tier = self::TIER_RESTRICTED;
        } else {
            $tier = $this->tierForScore($score);
        }

        return [
            'score'   => $score,
            'factors' => $factors,
            'tier'    => $tier,
        ];
    }

    public function tierForScore(float $score): string
    {
        if ($score >= self::THRESHOLD_PREFERRED) {
            return self::TIER_PREFERRED;
        }
        if ($score >= self::THRESHOLD_APPROVED) {
            return self::TIER_APPROVED;
        }
        if ($score >= self::THRESHOLD_WATCHLIST) {
            return self::TIER_WATCHLIST;
        }
        return self::TIER_RESTRICTED;
    }

    /**
     * Recalculate and persist ranking for a single supplier.
     */
    public function recalculate(Supplier $supplier): array
    {
        $result = $this->score($supplier);
        $supplier->update([
            'ranking_score'    => $result['score'],
            'ranking_tier'     => $result['tier'],
            'ranking_scored_at' => now(),
        ]);
        return $result;
    }

    /**
     * Recalculate ranking for all approved/suspended suppliers.
     *
     * @return array{processed: int, updated: int}
     */
    public function recalculateAll(): array
    {
        $suppliers = Supplier::whereIn('status', [Supplier::STATUS_APPROVED, Supplier::STATUS_SUSPENDED])
            ->get();
        $processed = 0;
        $updated = 0;
        foreach ($suppliers as $supplier) {
            $before = $supplier->ranking_score;
            $result = $this->recalculate($supplier);
            $processed++;
            if ($before != $result['score']) {
                $updated++;
            }
        }
        return ['processed' => $processed, 'updated' => $updated];
    }
}
