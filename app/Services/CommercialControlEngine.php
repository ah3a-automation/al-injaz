<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Project;

class CommercialControlEngine
{
    public const STATUS_OK    = 'OK';
    public const STATUS_WARN  = 'WARN';
    public const STATUS_BLOCK = 'BLOCK';

    /**
     * Forecast margin impact of a proposed additional cost against a project.
     *
     * Returns:
     *   status       — OK | WARN | BLOCK
     *   revenue      — total revenue from active BOQ version
     *   committed    — current committed cost (sum of package awarded_cost)
     *   proposed     — the proposed new cost being evaluated
     *   projected    — committed + proposed
     *   margin_pct   — projected margin % (null if revenue = 0)
     *   planned_pct  — project planned margin target
     *   min_pct      — project minimum margin floor
     */
    public function forecastMargin(Project $project, float $proposedCost): array
    {
        $revenue   = (float) ($project->activeBoqVersion?->total_revenue ?? 0);
        $committed = $this->getCommittedCost($project);
        $projected = $committed + $proposedCost;

        $marginPct = $revenue > 0
            ? round((($revenue - $projected) / $revenue) * 100, 4)
            : null;

        $plannedPct = (float) $project->planned_margin_pct;
        $minPct     = (float) $project->min_margin_pct;

        if ($marginPct === null) {
            $status = self::STATUS_BLOCK;
        } elseif ($marginPct < $minPct) {
            $status = self::STATUS_BLOCK;
        } elseif ($marginPct < $plannedPct) {
            $status = self::STATUS_WARN;
        } else {
            $status = self::STATUS_OK;
        }

        return [
            'status'      => $status,
            'revenue'     => $revenue,
            'committed'   => $committed,
            'proposed'    => $proposedCost,
            'projected'   => $projected,
            'margin_pct'  => $marginPct,
            'planned_pct' => $plannedPct,
            'min_pct'     => $minPct,
        ];
    }

    /**
     * Sum of awarded_cost across all packages for the project.
     * Represents currently committed cost at project level.
     * Will be replaced by contracts table sum in Session 10.
     */
    private function getCommittedCost(Project $project): float
    {
        return (float) $project->packages()->sum('awarded_cost');
    }
}
