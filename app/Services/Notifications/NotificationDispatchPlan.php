<?php

declare(strict_types=1);

namespace App\Services\Notifications;

/**
 * Normalized plan for the dispatcher to execute.
 */
final class NotificationDispatchPlan
{
    /**
     * @param array<string, NotificationDispatchChannelPlan> $channelPlans
     */
    public function __construct(
        public readonly ResolvedNotificationPolicyData $policy,
        public readonly array $resolvedRecipients,
        public readonly array $channelPlans,
    ) {}
}

