<?php

declare(strict_types=1);

namespace App\Application\Shared\DTOs;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;

final readonly class PaginatedResultDTO
{
    public function __construct(
        public array $items,
        public int $total,
        public int $currentPage,
        public int $perPage,
        public int $lastPage,
    ) {}

    public static function fromPaginator(LengthAwarePaginator $paginator): self
    {
        return new self(
            items: $paginator->items(),
            total: $paginator->total(),
            currentPage: $paginator->currentPage(),
            perPage: $paginator->perPage(),
            lastPage: $paginator->lastPage(),
        );
    }
}
