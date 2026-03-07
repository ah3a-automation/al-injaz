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

        return PaginatedResultDTO::fromPaginator($paginator);
    }
}