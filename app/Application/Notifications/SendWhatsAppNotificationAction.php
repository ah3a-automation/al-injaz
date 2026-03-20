<?php

declare(strict_types=1);

namespace App\Application\Notifications;

use App\Models\User;
use App\Notifications\BaseAppNotification;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Stub: log delivery intent only; never sends and never throws.
 */
final class SendWhatsAppNotificationAction
{
    public function execute(object $notifiable, BaseAppNotification $notification): void
    {
        try {
            $userId = $notifiable instanceof User ? (string) $notifiable->id : 'unknown';
            Log::info('[WhatsApp stub] Would send notification', [
                'event'         => $notification->getEventCode(),
                'recipient_id'  => $userId,
            ]);
        } catch (Throwable) {
            // Never throw from stub
        }
    }
}
