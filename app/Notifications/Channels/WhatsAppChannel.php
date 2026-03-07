<?php

declare(strict_types=1);

namespace App\Notifications\Channels;

use Illuminate\Notifications\Notification;

class WhatsAppChannel
{
    public function send(mixed $notifiable, Notification $notification): void
    {
        // TODO Session future: implement WhatsApp provider (Twilio / Unifonic / 360dialog)
        \Log::info('[WhatsApp] Notification queued for: ' . ($notifiable->phone ?? 'no phone'));
    }
}
