<?php

declare(strict_types=1);

namespace App\Eloquent\Relations;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphMany;

/**
 * MorphMany that always compares model_id as string (for PostgreSQL varchar model_id).
 * Use when the media table has model_id as VARCHAR and the parent may have integer id (e.g. User).
 */
class MorphManyWithStringKey extends MorphMany
{
    /**
     * Always compare the parent key as string for varchar morph IDs.
     */
    public function getParentKey(): mixed
    {
        $key = parent::getParentKey();
        return $key === null ? null : (string) $key;
    }

    /**
     * Cast eager-loaded parent keys to strings to avoid varchar = integer in PostgreSQL.
     *
     * @param  array<int, Model>  $models
     * @return array<int, string|null>
     */
    protected function getKeys(array $models, $key = null): array
    {
        /** @var array<int, int|string|null> $keys */
        $keys = parent::getKeys($models, $key);

        return array_map(
            static fn (int|string|null $value): ?string => $value === null ? null : (string) $value,
            $keys
        );
    }

    /**
     * Force standard whereIn so bindings stay as strings.
     */
    protected function whereInMethod(Model $model, $key): string
    {
        return 'whereIn';
    }
}
