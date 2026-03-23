<?php

declare(strict_types=1);

namespace App\Services\Procurement;

/**
 * Deterministic SHA-256 over the canonical JSON of the immutable snapshot payload.
 */
final class RfqSupplierQuoteSnapshotChecksum
{
    /**
     * @param array<string, mixed> $snapshotPayload Final payload stored in snapshot_data (no checksum field inside).
     */
    public static function compute(array $snapshotPayload): string
    {
        $canonical = self::canonicalize($snapshotPayload);
        $json = json_encode($canonical, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        return hash('sha256', $json);
    }

    /**
     * @param array<mixed> $data
     * @return array<mixed>
     */
    private static function canonicalize(array $data): array
    {
        if (array_is_list($data)) {
            return array_values(array_map(
                static fn (mixed $item): mixed => is_array($item) ? self::canonicalize($item) : $item,
                $data
            ));
        }

        $out = [];
        foreach ($data as $k => $v) {
            $out[$k] = is_array($v) ? self::canonicalize($v) : $v;
        }
        ksort($out);

        return $out;
    }
}
