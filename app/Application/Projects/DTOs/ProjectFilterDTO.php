<?php

declare(strict_types=1);

namespace App\Application\Projects\DTOs;

use App\Application\Shared\DTOs\FilterDTO;
use Illuminate\Http\Request;

final class ProjectFilterDTO extends FilterDTO
{
    public ?string $status   = null;
    public ?string $ownerId  = null;
    public ?string $dateFrom = null;
    public ?string $dateTo   = null;

    public static function fromRequest(Request $request): self
    {
        $dto = new self();

        // --- Base fields (top-level query params) ---

        $q = $request->input('q');
        $dto->q = is_string($q) && $q !== '' ? $q : null;

        $page = $request->input('page');
        $dto->page = is_numeric($page) ? max(1, (int) $page) : 1;

        $perPage = $request->input('per_page');
        $dto->perPage = is_numeric($perPage) ? max(1, min(100, (int) $perPage)) : 25;

        // Sort accepts both flat (sort_field, sort_dir) and nested (sort.field, sort.dir)
        $sortField = $request->input('sort_field') ?? $request->input('sort.field');
        $dto->sortField = is_string($sortField) && $sortField !== '' ? $sortField : null;

        $sortDir = $request->input('sort_dir') ?? $request->input('sort.dir');
        $dto->sortDir = is_string($sortDir) && in_array($sortDir, ['asc', 'desc'], true)
            ? $sortDir
            : 'asc';

        $selectedIds = $request->input('selected_ids');
        $dto->selectedIds = is_array($selectedIds)
            ? array_values(array_filter($selectedIds, 'is_string'))
            : [];

        $hiddenColumns = $request->input('hidden_columns') ?? $request->input('columns.hidden');
        $dto->hiddenColumns = is_array($hiddenColumns)
            ? array_values(array_filter($hiddenColumns, 'is_string'))
            : [];

        // --- Project-specific fields (top-level query params) ---
        // Frontend sends: ?status=on_hold&owner_id=...
        // NOT nested inside filters[status] — read directly from top level

        $status = $request->input('status');
        $dto->status = is_string($status) && $status !== '' ? $status : null;

        $ownerId = $request->input('owner_id');
        $dto->ownerId = is_string($ownerId) && $ownerId !== '' ? $ownerId : null;

        $dateFrom = $request->input('date_from');
        $dto->dateFrom = is_string($dateFrom) && $dateFrom !== '' ? $dateFrom : null;

        $dateTo = $request->input('date_to');
        $dto->dateTo = is_string($dateTo) && $dateTo !== '' ? $dateTo : null;

        return $dto;
    }
}