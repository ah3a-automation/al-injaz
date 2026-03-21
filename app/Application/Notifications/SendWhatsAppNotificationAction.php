<?php

declare(strict_types=1);

namespace App\Application\Notifications;

use App\Models\User;
use App\Notifications\BaseAppNotification;
use App\Services\WhatsApp\EvolutionApiClient;
use App\Support\WhatsAppPhoneNormalizer;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Sends WhatsApp via Evolution API; never throws — logs and returns.
 */
final class SendWhatsAppNotificationAction
{
    public function __construct(
        private readonly EvolutionApiClient $evolutionApiClient,
    ) {}

    public function execute(object $notifiable, BaseAppNotification $notification): void
    {
        try {
            if (! method_exists($notification, 'toWhatsApp')) {
                return;
            }

            $message = $notification->toWhatsApp($notifiable);
            if ($message === '') {
                return;
            }

            $phone = $this->resolvePhone($notifiable);
            if ($phone === null || $phone === '') {
                Log::warning('WhatsApp: no phone number for notifiable.', [
                    'event' => $notification->getEventCode(),
                    'notifiable_type' => is_object($notifiable) ? $notifiable::class : 'unknown',
                ]);

                return;
            }

            $this->evolutionApiClient->sendText($phone, $message);
        } catch (Throwable $e) {
            Log::warning('WhatsApp: notification send failed.', [
                'event' => $notification->getEventCode(),
                'message' => $e->getMessage(),
            ]);
        }
    }

    private function resolvePhone(object $notifiable): ?string
    {
        if ($notifiable instanceof User) {
            return $notifiable->getWhatsAppPhone();
        }

        foreach (['phone', 'mobile', 'whatsapp_number'] as $prop) {
            if (! property_exists($notifiable, $prop)) {
                continue;
            }
            $raw = $notifiable->{$prop} ?? null;
            if (! is_string($raw) || trim($raw) === '') {
                continue;
            }
            $n = WhatsAppPhoneNormalizer::normalize($raw);

            return $n !== '' ? $n : null;
        }

        return null;
    }
}
