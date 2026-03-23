<?php

declare(strict_types=1);

namespace App\Casts;

use App\Services\Procurement\RfqSupplierQuoteSnapshotComparisonHelper;
use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Database\Eloquent\Model;

/**
 * Decodes snapshot JSON and normalizes comparison fields (e.g. quoted_total_amount as float after JSON int).
 *
 * @implements CastsAttributes<array<string, mixed>|null, array<string, mixed>|null>
 */
final class RfqSupplierQuoteSnapshotDataCast implements CastsAttributes
{
    public function get(Model $model, string $key, mixed $value, array $attributes): ?array
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (is_array($value)) {
            return RfqSupplierQuoteSnapshotComparisonHelper::normalizeSnapshotDataForRead($value);
        }

        $decoded = json_decode((string) $value, true);
        if (! is_array($decoded)) {
            return [];
        }

        return RfqSupplierQuoteSnapshotComparisonHelper::normalizeSnapshotDataForRead($decoded);
    }

    public function set(Model $model, string $key, mixed $value, array $attributes): ?string
    {
        if ($value === null) {
            return null;
        }

        return json_encode($value, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
    }
}
