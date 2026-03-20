<?php

declare(strict_types=1);

namespace App\Services\Procurement;

use App\Models\ProcurementPackage;

final class PackageReadinessService
{
    private const SCORE_BOQ_ITEMS = 25;

    private const SCORE_DOCUMENTS = 25;

    private const SCORE_ESTIMATED_COST = 25;

    private const SCORE_SUPPLIERS = 25;

    /**
     * Check if a package is ready for RFQ creation and compute readiness score.
     * Ready requires: boq_items, documents, estimated_cost. Suppliers do not block (future validation).
     *
     * @return array{ready: bool, score: int, missing: list<string>}
     */
    public function check(ProcurementPackage $package): array
    {
        $missing = [];
        $score = 0;

        $package->loadCount(['boqItems', 'attachments']);

        if ($package->boq_items_count >= 1) {
            $score += self::SCORE_BOQ_ITEMS;
        } else {
            $missing[] = 'boq_items';
        }

        if ($package->attachments_count >= 1) {
            $score += self::SCORE_DOCUMENTS;
        } else {
            $missing[] = 'documents';
        }

        if ($package->estimated_cost !== null && (float) $package->estimated_cost > 0) {
            $score += self::SCORE_ESTIMATED_COST;
        } else {
            $missing[] = 'estimated_cost';
        }

        $hasSuppliers = $this->hasPotentialSuppliers($package);
        if ($hasSuppliers) {
            $score += self::SCORE_SUPPLIERS;
        } else {
            $missing[] = 'suppliers';
        }

        $ready = ! in_array('boq_items', $missing, true)
            && ! in_array('documents', $missing, true)
            && ! in_array('estimated_cost', $missing, true);

        return [
            'ready'   => $ready,
            'score'   => $score,
            'missing' => $missing,
        ];
    }

    /**
     * Package has at least one potential supplier (e.g. via package_suppliers or RFQ suppliers).
     * For now: not implemented; always false. Do not block RFQ creation on this.
     */
    private function hasPotentialSuppliers(ProcurementPackage $package): bool
    {
        if (method_exists($package, 'packageSuppliers') && $package->packageSuppliers()->exists()) {
            return true;
        }

        if ($package->rfqs()->whereHas('suppliers')->exists()) {
            return true;
        }

        return false;
    }
}
