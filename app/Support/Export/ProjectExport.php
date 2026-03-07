<?php

declare(strict_types=1);

namespace App\Support\Export;

use App\Models\Project;
use App\Support\Export\Contracts\Exportable;
use Illuminate\Database\Eloquent\Builder;

class ProjectExport implements Exportable
{
    public function getType(): string
    {
        return 'projects';
    }

    public function getTitle(): string
    {
        return 'Projects Export';
    }

    public function getHeadings(): array
    {
        return ['Name', 'Status', 'Owner', 'Start Date', 'End Date', 'Created At'];
    }

    public function getQuery(array $filters): Builder
    {
        return Project::query()
            ->with('owner:id,name')
            ->when(! empty($filters['q']), fn ($q) => $q->where(fn ($inner) => $inner
                ->where('name', 'ilike', '%' . $filters['q'] . '%')
                ->orWhere('description', 'ilike', '%' . $filters['q'] . '%')))
            ->when(! empty($filters['status']), fn ($q) => $q->where('status', $filters['status']))
            ->when(! empty($filters['owner_id']), fn ($q) => $q->where('owner_user_id', $filters['owner_id']))
            ->when(! empty($filters['date_from']), fn ($q) => $q->whereDate('created_at', '>=', $filters['date_from']))
            ->when(! empty($filters['date_to']), fn ($q) => $q->whereDate('created_at', '<=', $filters['date_to']))
            ->orderBy('id');
    }

    public function mapRow(mixed $model): array
    {
        \assert($model instanceof Project);

        return [
            $model->name,
            $model->status,
            $model->owner?->name ?? '—',
            $model->start_date?->format('Y-m-d'),
            $model->end_date?->format('Y-m-d'),
            $model->created_at?->format('Y-m-d'),
        ];
    }
}
