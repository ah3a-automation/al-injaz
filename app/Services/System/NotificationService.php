<?php

declare(strict_types=1);

namespace App\Services\System;

use App\Events\SystemNotificationCreated;
use App\Models\SystemNotification;
use App\Models\User;
use Illuminate\Support\Collection;

final class NotificationService
{
    public function notifyUser(
        User $user,
        string $eventKey,
        string $title,
        string $message,
        string $link = '',
        array $metadata = []
    ): SystemNotification {
        $notification = SystemNotification::create([
            'user_id'         => $user->id,
            'event_key'       => $eventKey,
            'title'           => $title,
            'message'         => $message,
            'link'            => $link ?: null,
            'status'          => SystemNotification::STATUS_PENDING,
            'metadata'        => $metadata,
        ]);

        // Database remains source of truth; broadcast is a secondary UI freshness signal.
        // If broadcasting is disabled, event dispatch is a safe no-op for runtime behavior.
        $unreadCount = SystemNotification::query()
            ->where('user_id', $user->id)
            ->where('status', '!=', SystemNotification::STATUS_READ)
            ->count();

        event(SystemNotificationCreated::fromModel($notification, $unreadCount));

        return $notification;
    }

    /**
     * @param  Collection<int, User>  $users
     * @return Collection<int, SystemNotification>
     */
    public function notifyUsers(
        Collection $users,
        string $eventKey,
        string $title,
        string $message,
        string $link = '',
        array $metadata = []
    ): Collection {
        $users = $users->unique('id');
        return $users->map(fn (User $user) => $this->notifyUser($user, $eventKey, $title, $message, $link, $metadata));
    }
}
