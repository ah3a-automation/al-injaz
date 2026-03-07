<?php

declare(strict_types=1);

namespace App\Application\Procurement\Queries;

use App\Models\Project;
use App\Models\ProjectBoqItem;
use Illuminate\Contracts\Pagination\CursorPaginator;
use Illuminate\Database\Eloquent\Collection;

final class BoqItemsForPackageCreateQuery
{
    public const PER_PAGE = 50;

    public const QUICK_FILTER_HIGH_MARGIN = 'high_margin';

    public const QUICK_FILTER_LOW_MARGIN = 'low_margin';

    public const QUICK_FILTER_UNUSED = 'unused';

    public const QUICK_FILTER_HIGH_COST = 'high_cost';

    /** @var list<string> */
    public const QUICK_FILTER_VALUES = [
        self::QUICK_FILTER_HIGH_MARGIN,
        self::QUICK_FILTER_LOW_MARGIN,
        self::QUICK_FILTER_UNUSED,
        self::QUICK_FILTER_HIGH_COST,
    ];

    /**
     * Columns required by the package-create BOQ selector UI (partial hydration).
     */
    private const SELECT_COLUMNS = [
        'project_boq_items.id',
        'project_boq_items.code',
        'project_boq_items.description_en',
        'project_boq_items.unit',
        'project_boq_items.qty',
        'project_boq_items.revenue_amount',
        'project_boq_items.planned_cost',
        'project_boq_items.lead_type',
    ];

    /**
     * Load active BOQ version items with package_usage_count, request_usage_count, actual_cost_sum.
     * Uses aggregated LEFT JOIN subqueries (one pass per aggregation) instead of correlated subqueries.
     */
    public function execute(Project $project, ?string $search = null, ?string $unit = null, ?string $leadType = null, bool $unusedOnly = false, ?string $quickFilter = null): Collection
    {
        $boqVersion = $project->boqVersions()->where('status', 'active')->latest()->first();
        if (! $boqVersion) {
            return new Collection([]);
        }

        $query = $this->buildQuery($boqVersion, $search, $unit, $leadType, $unusedOnly, $quickFilter);

        return $query->get();
    }

    /**
     * Cursor-paginated result for large BOQ sets. Uses idx_boq_search FTS when searching.
     * Order is deterministic (sort_order, id) for stable cursors.
     */
    public function executeCursorPaginated(
        Project $project,
        ?string $search = null,
        ?string $unit = null,
        ?string $leadType = null,
        bool $unusedOnly = false,
        ?string $quickFilter = null,
        ?string $cursor = null,
        int $perPage = self::PER_PAGE,
    ): CursorPaginator {
        $boqVersion = $project->boqVersions()->where('status', 'active')->latest()->first();
        if (! $boqVersion) {
            return new \Illuminate\Pagination\CursorPaginator([], $perPage);
        }

        $query = $this->buildQuery($boqVersion, $search, $unit, $leadType, $unusedOnly, $quickFilter);

        return $query->cursorPaginate($perPage, ['*'], 'cursor', $cursor);
    }

    private function buildQuery(\App\Models\BoqVersion $boqVersion, ?string $search, ?string $unit, ?string $leadType, bool $unusedOnly, ?string $quickFilter = null): \Illuminate\Database\Eloquent\Builder
    {
        $packageUsageSubquery = ProjectBoqItem::query()
            ->from('procurement_package_items as ppi')
            ->select('ppi.boq_item_id')
            ->selectRaw('COUNT(DISTINCT ppi.package_id) AS package_usage_count')
            ->groupBy('ppi.boq_item_id');

        $requestUsageSubquery = ProjectBoqItem::query()
            ->from('procurement_requests as pr')
            ->join('procurement_package_items as ppi', 'pr.package_id', '=', 'ppi.package_id')
            ->select('ppi.boq_item_id')
            ->selectRaw('COUNT(pr.id) AS request_usage_count')
            ->groupBy('ppi.boq_item_id');

        $query = ProjectBoqItem::query()
            ->where('project_boq_items.boq_version_id', $boqVersion->id)
            ->leftJoinSub($packageUsageSubquery, 'pkg_usage', function ($join): void {
                $join->on('pkg_usage.boq_item_id', '=', 'project_boq_items.id');
            })
            ->leftJoinSub($requestUsageSubquery, 'req_usage', function ($join): void {
                $join->on('req_usage.boq_item_id', '=', 'project_boq_items.id');
            })
            ->select(array_merge(self::SELECT_COLUMNS, [
                'project_boq_items.sort_order',
            ]))
            ->selectRaw('COALESCE(pkg_usage.package_usage_count, 0) AS package_usage_count')
            ->selectRaw('COALESCE(req_usage.request_usage_count, 0) AS request_usage_count')
            ->selectRaw('0 AS actual_cost_sum');

        if ($search !== null && $search !== '') {
            $tokens = $this->tokenizeSearch($search);
            foreach ($tokens as $token) {
                $pattern = '%' . $this->escapeIlikePattern($token) . '%';
                $query->where(function ($q) use ($pattern): void {
                    $q->where('project_boq_items.code', 'ilike', $pattern)
                        ->orWhere('project_boq_items.description_en', 'ilike', $pattern)
                        ->orWhere('project_boq_items.description_ar', 'ilike', $pattern);
                });
            }
        }
        if ($unit !== null && $unit !== '') {
            $query->where('project_boq_items.unit', $unit);
        }
        if ($leadType !== null && $leadType !== '') {
            $query->where('project_boq_items.lead_type', $leadType);
        }
        if ($unusedOnly) {
            $query->whereNotExists(function ($q): void {
                $q->selectRaw('1')
                    ->from('procurement_package_items')
                    ->whereColumn('procurement_package_items.boq_item_id', 'project_boq_items.id');
            });
        }

        if ($quickFilter !== null && $quickFilter !== '' && in_array($quickFilter, self::QUICK_FILTER_VALUES, true)) {
            switch ($quickFilter) {
                case self::QUICK_FILTER_HIGH_MARGIN:
                    $query->whereRaw(
                        'project_boq_items.revenue_amount > 0 AND ((project_boq_items.revenue_amount - COALESCE(project_boq_items.planned_cost, 0)) / project_boq_items.revenue_amount * 100) > 20'
                    );
                    break;
                case self::QUICK_FILTER_LOW_MARGIN:
                    $query->whereRaw(
                        'project_boq_items.revenue_amount > 0 AND ((project_boq_items.revenue_amount - COALESCE(project_boq_items.planned_cost, 0)) / project_boq_items.revenue_amount * 100) < 5'
                    );
                    break;
                case self::QUICK_FILTER_UNUSED:
                    $query->whereNotExists(function ($q): void {
                        $q->selectRaw('1')
                            ->from('procurement_package_items')
                            ->whereColumn('procurement_package_items.boq_item_id', 'project_boq_items.id');
                    });
                    break;
                case self::QUICK_FILTER_HIGH_COST:
                    $query->whereRaw('COALESCE(project_boq_items.planned_cost, 0) > 10000');
                    break;
            }
        }

        $query->orderBy('project_boq_items.sort_order')
            ->orderBy('project_boq_items.id');

        return $query;
    }

    /**
     * @return array<int, string>
     */
    private function tokenizeSearch(string $search): array
    {
        $normalized = trim(preg_replace('/\s+/', ' ', $search) ?? '');
        if ($normalized === '') {
            return [];
        }
        $tokens = explode(' ', $normalized);
        return array_values(array_filter(array_map('trim', $tokens)));
    }

    private function escapeIlikePattern(string $value): string
    {
        return str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $value);
    }
}
