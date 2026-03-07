<?php

declare(strict_types=1);

namespace App\Application\Shared\DTOs;

use Illuminate\Http\Request;

class FilterDTO
{
    public ?string $q = null;

    /** @var array<string, scalar|array<string, mixed>|bool|null> */
    public array $filters = [];

    public ?string $sortField = null;

    public string $sortDir = 'asc';

    public int $page = 1;

    public int $perPage = 25;

    /** @var array<int, string> */
    public array $selectedIds = [];

    /** @var array<int, string> */
    public array $hiddenColumns = [];

    public static function fromRequest(Request $request): self
    {
        $dto = new self();

        $q = $request->input('q');
        if (is_string($q)) {
            $dto->q = $q;
        }

        $filters = $request->input('filters');
        if (is_array($filters)) {
            $dto->filters = $filters;
        }

        $sortField = $request->input('sort.field');
        if (is_string($sortField)) {
            $dto->sortField = $sortField;
        }

        $sortDir = $request->input('sort.dir');
        if (is_string($sortDir) && in_array($sortDir, ['asc', 'desc'], true)) {
            $dto->sortDir = $sortDir;
        }

        $page = $request->input('page');
        if (is_numeric($page)) {
            $dto->page = max(1, (int) $page);
        }

        $perPage = $request->input('per_page');
        if (is_numeric($perPage)) {
            $dto->perPage = max(1, min(100, (int) $perPage));
        }

        $selectedIds = $request->input('selected_ids');
        if (is_array($selectedIds)) {
            $dto->selectedIds = array_values(array_filter($selectedIds, 'is_string'));
        }

        $hiddenColumns = $request->input('columns.hidden');
        if (is_array($hiddenColumns)) {
            $dto->hiddenColumns = array_values(array_filter($hiddenColumns, 'is_string'));
        }

        return $dto;
    }
}
