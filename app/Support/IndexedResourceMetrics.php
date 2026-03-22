<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\Contract;
use App\Models\Rfq;

/**
 * Single-query dashboard metrics for RFQ and Contract index pages (PostgreSQL FILTER).
 */
final class IndexedResourceMetrics
{
    /**
     * @return array{total: int, draft: int, active: int, closed: int}
     */
    public static function rfqMetrics(): array
    {
        $activeStatuses = [
            Rfq::STATUS_APPROVED,
            Rfq::STATUS_ISSUED,
            Rfq::STATUS_SUPPLIER_QUESTIONS,
            Rfq::STATUS_RESPONSES_RECEIVED,
            Rfq::STATUS_UNDER_EVALUATION,
            Rfq::STATUS_RECOMMENDED,
        ];
        $closedStatuses = [Rfq::STATUS_CLOSED, Rfq::STATUS_AWARDED];
        $placeholdersActive = implode(',', array_fill(0, count($activeStatuses), '?'));
        $placeholdersClosed = implode(',', array_fill(0, count($closedStatuses), '?'));
        $bindings = array_merge($activeStatuses, $closedStatuses);

        $row = Rfq::query()
            ->selectRaw("
                COUNT(*)::int as total,
                COUNT(*) FILTER (WHERE status = 'draft')::int as draft,
                COUNT(*) FILTER (WHERE status IN ({$placeholdersActive}))::int as active,
                COUNT(*) FILTER (WHERE status IN ({$placeholdersClosed}))::int as closed
            ", $bindings)
            ->first();

        return [
            'total' => isset($row->total) ? (int) $row->total : 0,
            'draft' => isset($row->draft) ? (int) $row->draft : 0,
            'active' => isset($row->active) ? (int) $row->active : 0,
            'closed' => isset($row->closed) ? (int) $row->closed : 0,
        ];
    }

    /**
     * @return array{total: int, draft: int, active: int, completed: int}
     */
    public static function contractMetrics(): array
    {
        $row = Contract::query()
            ->selectRaw('COUNT(*)::int as total')
            ->selectRaw("COUNT(*) FILTER (WHERE status = '".Contract::STATUS_DRAFT."')::int as draft")
            ->selectRaw("COUNT(*) FILTER (WHERE status = '".Contract::STATUS_ACTIVE."')::int as active")
            ->selectRaw("COUNT(*) FILTER (WHERE status = '".Contract::STATUS_COMPLETED."')::int as completed")
            ->first();

        return [
            'total' => isset($row->total) ? (int) $row->total : 0,
            'draft' => isset($row->draft) ? (int) $row->draft : 0,
            'active' => isset($row->active) ? (int) $row->active : 0,
            'completed' => isset($row->completed) ? (int) $row->completed : 0,
        ];
    }
}
