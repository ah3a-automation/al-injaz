<?php

declare(strict_types=1);

namespace App\Notifications\Channels;

use App\Application\Notifications\SendEmailNotificationAction;
use App\Notifications\BaseAppNotification;
use Illuminate\Notifications\Notification;

final class AppMailChannel
{
    public function __construct(
        private readonly SendEmailNotificationAction $sendEmailNotification,
    ) {}

    public function send(mixed $notifiable, Notification $notification): void
    {
        if (! $notification instanceof BaseAppNotification) {
            return;
        }

        $this->sendEmailNotification->execute($notifiable, $notification);
    }
}
