<?php

declare(strict_types=1);

namespace App\Application\Notifications;

use App\Events\SystemNotificationCreated;
use App\Models\SystemNotification;

final class BroadcastSystemNotificationAction
{
    public function execute(SystemNotification $notification): void
    {
        $unreadCount = SystemNotification::query()
            ->where('user_id', $notification->user_id)
            ->where('status', '!=', SystemNotification::STATUS_READ)
            ->count();

        event(SystemNotificationCreated::fromModel($notification, $unreadCount));
    }
}
