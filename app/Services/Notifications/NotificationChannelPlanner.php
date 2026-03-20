<?php

declare(strict_types=1);

namespace App\Services\Notifications;

use App\Domain\Notifications\NotificationEventCatalog;

final class NotificationChannelPlanner
{
    /**
     * @param array<int, ResolvedRecipientData> $resolvedRecipients
     */
    public function plan(ResolvedNotificationPolicyData $policy, array $resolvedRecipients): NotificationDispatchPlan
    {
        $definitions = NotificationEventCatalog::hardenedDefinitions();
        $def = $definitions[$policy->effectiveEventKey]
            ?? $definitions[$policy->canonicalEventKey]
            ?? null;

        $supportsInternal = $def['supports_internal'] ?? true;
        $supportsEmail = $def['supports_email'] ?? true;

        $sendInternal = $policy->sendInternal && $supportsInternal;
        $sendEmail = $policy->sendEmail && $supportsEmail;

        $internalRecipients = [];
        $emailRecipients = [];

        foreach ($resolvedRecipients as $recipient) {
            $override = $recipient->channelOverride;
            if ($override === 'internal') {
                if ($recipient->userId !== null) {
                    $internalRecipients[] = $recipient;
                }
                continue;
            }

            if ($override === 'email') {
                if ($recipient->email !== null) {
                    $emailRecipients[] = $recipient;
                }
                continue;
            }

            // Default routing based on data availability.
            if ($recipient->userId !== null && $recipient->recipientType !== 'explicit_email') {
                $internalRecipients[] = $recipient;
            }

            if ($recipient->email !== null) {
                $emailRecipients[] = $recipient;
            }
        }

        $channelPlans = [];
        if ($sendInternal && $internalRecipients !== []) {
            $channelPlans['internal'] = new NotificationDispatchChannelPlan('internal', $internalRecipients);
        }

        if ($sendEmail && $emailRecipients !== []) {
            $channelPlans['email'] = new NotificationDispatchChannelPlan('email', $emailRecipients);
        }

        return new NotificationDispatchPlan(
            policy: $policy,
            resolvedRecipients: $resolvedRecipients,
            channelPlans: $channelPlans
        );
    }
}

