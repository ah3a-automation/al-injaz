<?php

declare(strict_types=1);

namespace App\Services\Notifications;

/**
 * Effective notification policy after alias resolution and environment checks.
 */
final class ResolvedNotificationPolicyData
{
    /**
     * @param array<string, mixed> $conditionsJson
     * @param array<string, mixed> $metadata
     */
    public function __construct(
        public readonly string $emittedEventKey,
        public readonly string $effectiveEventKey,
        public readonly string $canonicalEventKey,
        public readonly string $notificationSettingId,
        public readonly string $module,
        public readonly bool $isEnabled,
        public readonly bool $sendInternal,
        public readonly bool $sendEmail,
        public readonly bool $sendSms,
        public readonly bool $sendWhatsapp,
        public readonly string $deliveryMode,
        public readonly ?string $digestFrequency,
        public readonly string $environmentScope,
        public readonly array $conditionsJson,
        public readonly ?string $templateEventCode,
        public readonly ?string $sourceEventKey,
        public readonly array $metadata,
    ) {}
}

