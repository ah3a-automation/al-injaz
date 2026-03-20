<?php

declare(strict_types=1);

namespace App\Application\Projects\Queries;

use App\Application\Projects\DTOs\ProjectFilterDTO;
use App\Application\Shared\DTOs\PaginatedResultDTO;
use App\Models\Project;

final class ListProjectsQuery
{
    private const ALLOWED_SORT_FIELDS = ['name', 'status', 'created_at'];

    public function execute(ProjectFilterDTO $filter): PaginatedResultDTO
    {
        $query = Project::query();

        if ($filter->q !== null && $filter->q !== '') {
            $query->where(function ($q) use ($filter) {
                $q->where('name', 'ilike', '%' . $filter->q . '%')
                  ->orWhere('description', 'ilike', '%' . $filter->q . '%');
            });
        }

        // Status filter
        if (!empty($filter->status)) {
            $query->where('status', $filter->status);
        }

        if ($filter->ownerId !== null && $filter->ownerId !== '') {
            $query->where('owner_user_id', $filter->ownerId);
        }

        if ($filter->dateFrom !== null && $filter->dateFrom !== '') {
            $query->whereDate('created_at', '>=', $filter->dateFrom);
        }

        if ($filter->dateTo !== null && $filter->dateTo !== '') {
            $query->whereDate('created_at', '<=', $filter->dateTo);
        }

        $sortField = $filter->sortField && in_array($filter->sortField, self::ALLOWED_SORT_FIELDS, true)
            ? $filter->sortField
            : 'created_at';

        $sortDir = $filter->sortDir === 'desc' ? 'desc' : 'asc';

        $query->orderBy($sortField, $sortDir);

        $query->with('owner:id,name');

        $paginator = $query->paginate($filter->perPage, ['*'], 'page', $filter->page);

        // Map additional derived fields for UI (remaining days etc.)
        $items = $paginator->getCollection()->map(function (Project $project) {
            $start = $project->start_date;
            $end = $project->end_date;

            $remainingDays = null;
            $totalDurationDays = null;
            $remainingRatio = null;

            if ($end !== null) {
                $today = now()->startOfDay();
                $endDate = $end->copy()->startOfDay();
                $remainingDays = $today->diffInDays($endDate, false);

                if ($start !== null) {
                    $startDate = $start->copy()->startOfDay();
                    $totalDurationDays = max($startDate->diffInDays($endDate, false), 0);
                    if ($totalDurationDays > 0) {
                        $remainingRatio = $remainingDays / $totalDurationDays;
                    }
                }
            }

            $project->setAttribute('remaining_days', $remainingDays);
            $project->setAttribute('total_project_duration_days', $totalDurationDays);
            $project->setAttribute('remaining_ratio', $remainingRatio);

            return $project;
        });

        $paginator->setCollection($items);

        return PaginatedResultDTO::fromPaginator($paginator);
    }
}