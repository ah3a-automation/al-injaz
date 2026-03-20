<?php

declare(strict_types=1);

namespace App\Notifications\Channels;

use App\Application\Notifications\SendWhatsAppNotificationAction;
use App\Notifications\BaseAppNotification;
use Illuminate\Notifications\Notification;

final class WhatsAppChannel
{
    public function __construct(
        private readonly SendWhatsAppNotificationAction $sendWhatsAppNotification,
    ) {}

    public function send(mixed $notifiable, Notification $notification): void
    {
        if ($notification instanceof BaseAppNotification) {
            $this->sendWhatsAppNotification->execute($notifiable, $notification);
        }
    }
}
