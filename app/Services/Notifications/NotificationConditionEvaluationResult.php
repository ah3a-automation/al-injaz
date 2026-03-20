<?php

declare(strict_types=1);

namespace App\Services\Notifications;

final class NotificationConditionEvaluationResult
{
    /**
     * @param array<string, mixed> $metadata
     */
    public function __construct(
        public readonly bool $passed,
        public readonly ?string $reason = null,
        public readonly array $metadata = [],
    ) {}

    public static function passed(array $metadata = []): self
    {
        return new self(true, null, $metadata);
    }

    public static function failed(string $reason, array $metadata = []): self
    {
        return new self(false, $reason, $metadata);
    }
}

