<?php

declare(strict_types=1);

namespace App\Services\Notifications;

/**
 * A planned dispatch slice for a specific channel.
 */
final class NotificationDispatchChannelPlan
{
    /**
     * @param array<int, ResolvedRecipientData> $recipients
     */
    public function __construct(
        public readonly string $channel,
        public readonly array $recipients,
    ) {}
}

