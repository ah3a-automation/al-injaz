<?php

declare(strict_types=1);

namespace App\Notifications\Channels;

use App\Application\Notifications\BroadcastSystemNotificationAction;
use App\Application\Notifications\WriteSystemNotificationAction;
use App\Notifications\BaseAppNotification;
use Illuminate\Notifications\Notification;

final class SystemNotificationChannel
{
    public function __construct(
        private readonly WriteSystemNotificationAction $writeSystemNotification,
        private readonly BroadcastSystemNotificationAction $broadcastSystemNotification,
    ) {}

    public function send(mixed $notifiable, Notification $notification): void
    {
        if (! $notification instanceof BaseAppNotification || ! $notifiable instanceof \App\Models\User) {
            return;
        }

        $system = $this->writeSystemNotification->execute($notifiable, $notification, $notification->getNotifiable());
        $this->broadcastSystemNotification->execute($system);
    }
}
