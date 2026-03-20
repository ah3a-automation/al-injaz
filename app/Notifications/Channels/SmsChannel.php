<?php

declare(strict_types=1);

namespace App\Notifications\Channels;

use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Log;

final class SmsChannel
{
    public function send(mixed $notifiable, Notification $notification): void
    {
        // TODO Session future: implement SMS provider
        Log::info('[SMS] Notification queued for: '.($notifiable->phone ?? 'no phone'));
    }
}
