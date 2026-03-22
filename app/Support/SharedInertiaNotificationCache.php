<?php

declare(strict_types=1);

namespace App\Support;

use Illuminate\Support\Facades\Cache;

/**
 * Invalidates HandleInertiaRequests bell payload when system notifications change.
 */
final class SharedInertiaNotificationCache
{
    public static function cacheKey(int $userId): string
    {
        return 'inertia_shared_notifications:'.$userId;
    }

    public static function forget(int $userId): void
    {
        Cache::forget(self::cacheKey($userId));
    }
}
