<?php

declare(strict_types=1);

namespace App\Services\SupplierIntelligence;

use App\Models\Supplier;
use Illuminate\Support\Facades\DB;

final class SupplierFinancialCapacityService
{
    /**
     * Total awarded contract value (from RFQ awards) for this supplier.
     */
    public function getTotalAwardedValue(Supplier $supplier): float
    {
        $sum = DB::table('rfq_awards')
            ->where('supplier_id', $supplier->id)
            ->sum('awarded_amount');
        return (float) $sum;
    }

    /**
     * @return array{
     *     total_awarded_value: float,
     *     max_contract_value: ?float,
     *     credit_limit: ?float,
     *     utilization_percent: ?float,
     *     over_capacity: bool,
     *     status: 'within_capacity'|'over_capacity'|'unknown',
     * }
     */
    public function getCapacity(Supplier $supplier): array
    {
        $totalAwarded = $this->getTotalAwardedValue($supplier);
        $maxContract = $supplier->max_contract_value !== null ? (float) $supplier->max_contract_value : null;
        $creditLimit = $supplier->credit_limit !== null ? (float) $supplier->credit_limit : null;

        $cap = $maxContract ?? $creditLimit;
        $utilizationPercent = null;
        $overCapacity = false;
        $status = 'unknown';

        if ($cap !== null && $cap > 0) {
            $utilizationPercent = round(($totalAwarded / $cap) * 100, 1);
            $overCapacity = $totalAwarded > $cap;
            $status = $overCapacity ? 'over_capacity' : 'within_capacity';
        }

        return [
            'total_awarded_value' => $totalAwarded,
            'max_contract_value' => $maxContract,
            'credit_limit' => $creditLimit,
            'utilization_percent' => $utilizationPercent,
            'over_capacity' => $overCapacity,
            'status' => $status,
        ];
    }
}
