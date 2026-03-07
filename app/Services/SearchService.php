<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\User;
use App\Domain\Shared\Contracts\SearchableEntity;

class SearchService
{
    /**
     * Search across all registered SearchableEntity implementations.
     * Uses PostgreSQL Full-Text Search only — no LIKE queries.
     * Respects RBAC: filters results by what $user is authorized to view.
     * Excludes soft-deleted records.
     * Limits results per entity type (5-10 max per type).
     *
     * @return array<int, array{
     *   type: string,
     *   title: string,
     *   subtitle?: string,
     *   route: string
     * }>
     */
    public function search(string $query, ?User $user = null): array
    {
        // Stub — no implementation.
        return [];
    }
}
