<?php

declare(strict_types=1);

namespace App\Services\Notifications;

use App\Models\OutboxEvent;

/**
 * Central mapping between transactional outbox event keys and notification
 * policy event keys used by the Notification Configuration system.
 *
 * Phase 4 intentionally keeps this mapping explicit to avoid runtime guessing.
 */
final class NotificationOutboxEventKeyMapper
{
    public const META_NOTIFICATION_EVENT_KEY = 'notification_event_key';
    public const META_QUOTE_EVENT_KEY = 'quote_event_key';

    /**
     * @param array<string, mixed> $payload
     */
    public function mapOutboxEventKey(string $outboxEventKey, array $payload): ?string
    {
        $maybe = $payload[self::META_NOTIFICATION_EVENT_KEY] ?? null;
        if (is_string($maybe) && $maybe !== '') {
            return $maybe;
        }

        // RFQ quote: the policy event depends on submitted vs revised.
        if ($outboxEventKey === 'rfq.quote_submitted') {
            $quoteKey = $payload[self::META_QUOTE_EVENT_KEY] ?? null;
            if (is_string($quoteKey) && $quoteKey !== '') {
                return $quoteKey;
            }
        }

        // Known 1:1 aligned outbox key (when payload has no override).
        if ($outboxEventKey === 'rfq.evaluation') {
            return 'rfq.evaluation';
        }

        // Known mapping when payload has no override.
        if ($outboxEventKey === 'rfq.clarification_public') {
            return 'clarification.made_public';
        }

        return null;
    }

    public function mapOutboxEvent(OutboxEvent $event): ?string
    {
        $payload = is_array($event->payload) ? $event->payload : [];
        return $this->mapOutboxEventKey((string) $event->event_key, $payload);
    }
}

