<?php

declare(strict_types=1);

namespace App\Observers;

use App\Models\SystemNotification;
use App\Support\SharedInertiaNotificationCache;

final class SystemNotificationObserver
{
    public function saved(SystemNotification $notification): void
    {
        SharedInertiaNotificationCache::forget((int) $notification->user_id);
    }

    public function deleted(SystemNotification $notification): void
    {
        SharedInertiaNotificationCache::forget((int) $notification->user_id);
    }
}
