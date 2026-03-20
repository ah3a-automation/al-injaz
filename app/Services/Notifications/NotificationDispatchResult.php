<?php

declare(strict_types=1);

namespace App\Services\Notifications;

final class NotificationDispatchResult
{
    /**
     * @param array<int, string> $executedChannels
     * @param array<string, mixed> $meta
     */
    /**
     * @param array<string, mixed> $meta
     */
    public function __construct(
        public readonly bool $dispatched,
        public readonly array $executedChannels = [],
        public readonly string $status = 'dispatched',
        public readonly ?string $skippedReason = null,
        public readonly array $meta = [],
    ) {}
}

