<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\ContractClaim;
use App\Models\ContractNotice;
use App\Models\ContractObligation;
use App\Models\ContractSecurity;

/**
 * PostgreSQL conditional aggregation for contract execution summary counts (one query per table).
 */
final class ContractExecutionAggregates
{
    /**
     * @return array{total: int, draft: int, submitted: int, under_review: int, resolved: int, rejected: int}
     */
    public static function claimsSummary(string $contractId): array
    {
        $row = ContractClaim::query()
            ->where('contract_id', $contractId)
            ->selectRaw('COUNT(*)::int as total')
            ->selectRaw("COUNT(*) FILTER (WHERE status = 'draft')::int as draft")
            ->selectRaw("COUNT(*) FILTER (WHERE status = 'submitted')::int as submitted")
            ->selectRaw("COUNT(*) FILTER (WHERE status = 'under_review')::int as under_review")
            ->selectRaw("COUNT(*) FILTER (WHERE status = 'resolved')::int as resolved")
            ->selectRaw("COUNT(*) FILTER (WHERE status = 'rejected')::int as rejected")
            ->first();

        return self::mapNumericRow($row, ['total', 'draft', 'submitted', 'under_review', 'resolved', 'rejected']);
    }

    /**
     * @return array{total: int, draft: int, issued: int, responded: int, closed: int}
     */
    public static function noticesSummary(string $contractId): array
    {
        $row = ContractNotice::query()
            ->where('contract_id', $contractId)
            ->selectRaw('COUNT(*)::int as total')
            ->selectRaw("COUNT(*) FILTER (WHERE status = 'draft')::int as draft")
            ->selectRaw("COUNT(*) FILTER (WHERE status = 'issued')::int as issued")
            ->selectRaw("COUNT(*) FILTER (WHERE status = 'responded')::int as responded")
            ->selectRaw("COUNT(*) FILTER (WHERE status = 'closed')::int as closed")
            ->first();

        return self::mapNumericRow($row, ['total', 'draft', 'issued', 'responded', 'closed']);
    }

    /**
     * @return array{total: int, active: int, expiring: int, expired: int, released: int}
     */
    public static function securitiesSummary(string $contractId): array
    {
        $row = ContractSecurity::query()
            ->where('contract_id', $contractId)
            ->selectRaw('COUNT(*)::int as total')
            ->selectRaw("COUNT(*) FILTER (WHERE status = 'active')::int as active")
            ->selectRaw("COUNT(*) FILTER (WHERE status = 'expiring')::int as expiring")
            ->selectRaw("COUNT(*) FILTER (WHERE status = 'expired')::int as expired")
            ->selectRaw("COUNT(*) FILTER (WHERE status = 'released')::int as released")
            ->first();

        return self::mapNumericRow($row, ['total', 'active', 'expiring', 'expired', 'released']);
    }

    /**
     * @return array{total: int, not_started: int, in_progress: int, submitted: int, fulfilled: int, overdue: int}
     */
    public static function obligationsSummary(string $contractId): array
    {
        $row = ContractObligation::query()
            ->where('contract_id', $contractId)
            ->selectRaw('COUNT(*)::int as total')
            ->selectRaw("COUNT(*) FILTER (WHERE status = 'not_started')::int as not_started")
            ->selectRaw("COUNT(*) FILTER (WHERE status = 'in_progress')::int as in_progress")
            ->selectRaw("COUNT(*) FILTER (WHERE status = 'submitted')::int as submitted")
            ->selectRaw("COUNT(*) FILTER (WHERE status = 'fulfilled')::int as fulfilled")
            ->selectRaw("COUNT(*) FILTER (WHERE status = 'overdue')::int as overdue")
            ->first();

        return self::mapNumericRow($row, ['total', 'not_started', 'in_progress', 'submitted', 'fulfilled', 'overdue']);
    }

    /**
     * @param  array<int, string>  $keys
     * @return array<string, int>
     */
    private static function mapNumericRow(?object $row, array $keys): array
    {
        $out = [];
        foreach ($keys as $k) {
            $out[$k] = isset($row->{$k}) ? (int) $row->{$k} : 0;
        }

        return $out;
    }
}
