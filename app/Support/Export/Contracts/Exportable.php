<?php

declare(strict_types=1);

namespace App\Support\Export\Contracts;

use Illuminate\Database\Eloquent\Builder;

interface Exportable
{
    public function getQuery(array $filters): Builder;

    /**
     * @return array<int, mixed>
     */
    public function mapRow(mixed $model): array;

    public function getHeadings(): array;

    public function getTitle(): string;

    public function getType(): string;
}
