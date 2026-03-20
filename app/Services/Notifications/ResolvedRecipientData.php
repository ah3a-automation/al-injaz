<?php

declare(strict_types=1);

namespace App\Services\Notifications;

/**
 * Concrete recipient target resolved from `notification_recipients`.
 *
 * For Phase 2:
 * - Internal in-app notifications require `userId`.
 * - Email notifications require `email`.
 */
final class ResolvedRecipientData
{
    /**
     * @param array<string, mixed> $resolverMetadata
     */
    public function __construct(
        public readonly string $recipientType,
        public readonly ?int $userId,
        public readonly ?string $email,
        public readonly ?string $channelOverride,
        public readonly array $resolverMetadata = [],
    ) {}

    public function dedupeKey(): string
    {
        if ($this->userId !== null) {
            return 'user:' . $this->userId;
        }

        if ($this->email !== null) {
            return 'email:' . mb_strtolower($this->email);
        }

        return 'unknown';
    }
}

