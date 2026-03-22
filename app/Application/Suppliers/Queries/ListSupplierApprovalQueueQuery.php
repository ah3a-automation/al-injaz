<?php

declare(strict_types=1);

namespace App\Application\Suppliers\Queries;

use App\Models\Supplier;
use Carbon\CarbonInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;

final class ListSupplierApprovalQueueQuery
{
    public function __construct(
        private readonly ?string $q = null,
        private readonly ?string $status = null,
        private readonly ?string $supplierType = null,
        private readonly ?string $waitingBucket = null,
        private readonly int $perPage = 25,
        private readonly int $page = 1,
    ) {}

    /**
     * @return array{
     *     paginator: LengthAwarePaginator,
     *     stats: array{total_pending: int, avg_days_waiting: float|null, oldest_days_waiting: int|null}
     * }
     */
    public function handle(): array
    {
        $base = $this->filteredQuery();
        $stats = $this->computeStats(clone $base);

        $paginator = (clone $base)
            ->orderBy('created_at', 'asc')
            ->paginate($this->perPage, ['*'], 'page', $this->page);

        $mapped = $paginator->through(function (Supplier $s): array {
            return [
                'id' => $s->id,
                'supplier_code' => $s->supplier_code,
                'legal_name_en' => $s->legal_name_en,
                'legal_name_ar' => $s->legal_name_ar,
                'trade_name' => $s->trade_name,
                'supplier_type' => $s->supplier_type,
                'country' => $s->country,
                'city' => $s->city,
                'status' => $s->status,
                'created_at' => $s->created_at?->toIso8601String(),
                'submitted_at' => null,
                'days_waiting' => self::calendarDaysWaiting($s->created_at),
            ];
        });

        return [
            'paginator' => $mapped,
            'stats' => $stats,
        ];
    }

    private function filteredQuery(): Builder
    {
        $q = Supplier::query()
            ->whereIn('status', Supplier::APPROVAL_QUEUE_STATUSES)
            ->when($this->q !== null && $this->q !== '', function (Builder $query): void {
                $term = $this->q;
                $query->where(function (Builder $inner) use ($term): void {
                    $inner
                        ->where('legal_name_en', 'ilike', '%' . $term . '%')
                        ->orWhere('legal_name_ar', 'ilike', '%' . $term . '%')
                        ->orWhere('trade_name', 'ilike', '%' . $term . '%')
                        ->orWhere('supplier_code', 'ilike', '%' . $term . '%');
                });
            })
            ->when(
                $this->status !== null && $this->status !== ''
                    && in_array($this->status, Supplier::APPROVAL_QUEUE_STATUSES, true),
                fn (Builder $query): Builder => $query->where('status', $this->status)
            )
            ->when(
                $this->supplierType !== null && $this->supplierType !== '',
                fn (Builder $query): Builder => $query->where('supplier_type', $this->supplierType)
            );

        $this->applyWaitingBucket($q);

        return $q;
    }

    private function applyWaitingBucket(Builder $query): void
    {
        if ($this->waitingBucket === null || $this->waitingBucket === '') {
            return;
        }

        $threshold = match ($this->waitingBucket) {
            'gt3' => 3,
            'gt7' => 7,
            'gt14' => 14,
            default => null,
        };

        if ($threshold === null) {
            return;
        }

        $query->whereRaw('(CURRENT_DATE - (suppliers.created_at::date)) > ?', [$threshold]);
    }

    /**
     * @return array{total_pending: int, avg_days_waiting: float|null, oldest_days_waiting: int|null}
     */
    private function computeStats(Builder $base): array
    {
        $total = (clone $base)->count();

        if ($total === 0) {
            return [
                'total_pending' => 0,
                'avg_days_waiting' => null,
                'oldest_days_waiting' => null,
            ];
        }

        $row = (clone $base)
            ->selectRaw('AVG((CURRENT_DATE - (suppliers.created_at::date)))::float as avg_days')
            ->selectRaw('MAX((CURRENT_DATE - (suppliers.created_at::date)))::int as oldest_days')
            ->first();

        return [
            'total_pending' => $total,
            'avg_days_waiting' => isset($row->avg_days) ? round((float) $row->avg_days, 1) : null,
            'oldest_days_waiting' => isset($row->oldest_days) ? (int) $row->oldest_days : null,
        ];
    }

    public static function calendarDaysWaiting(?CarbonInterface $createdAt): int
    {
        if ($createdAt === null) {
            return 0;
        }

        $tz = (string) config('app.timezone');
        $start = $createdAt->copy()->timezone($tz)->startOfDay();
        $end = now()->timezone($tz)->startOfDay();

        return max(0, (int) $start->diffInDays($end, false));
    }
}
