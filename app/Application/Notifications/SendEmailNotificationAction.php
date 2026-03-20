<?php

declare(strict_types=1);

namespace App\Application\Notifications;

use App\Notifications\BaseAppNotification;
use Illuminate\Contracts\Notifications\Factory as NotificationFactory;

/**
 * Delegates to Laravel's mail notification driver (same as {@see BaseAppNotification::toMail} pipeline).
 */
final class SendEmailNotificationAction
{
    public function __construct(
        private readonly NotificationFactory $notifications,
    ) {}

    public function execute(object $notifiable, BaseAppNotification $notification): void
    {
        $this->notifications->driver('mail')->send($notifiable, $notification);
    }
}
