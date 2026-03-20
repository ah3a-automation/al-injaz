<?php

declare(strict_types=1);

namespace App\Services\Notifications;

use App\Services\Notifications\Channels\SendEmailNotificationAction;
use App\Services\Notifications\Channels\SendInternalNotificationAction;

final class NotificationDispatcher
{
    public function __construct(
        private readonly NotificationPolicyResolver $policyResolver,
        private readonly NotificationConditionEvaluator $conditionEvaluator,
        private readonly NotificationRecipientResolver $recipientResolver,
        private readonly NotificationChannelPlanner $channelPlanner,
        private readonly SendInternalNotificationAction $sendInternalAction,
        private readonly SendEmailNotificationAction $sendEmailAction,
    ) {}

    public function dispatch(string $emittedEventKey, NotificationEventContext $context): NotificationDispatchResult
    {
        logger()->debug('NotificationDispatcher: event received', [
            'event_key' => $emittedEventKey,
        ]);

        $policy = $this->policyResolver->resolve($emittedEventKey, $context);
        if ($policy === null) {
            return new NotificationDispatchResult(
                dispatched: false,
                executedChannels: [],
                status: 'skipped_policy_missing',
                skippedReason: 'No notification_settings row found',
            );
        }

        if ($policy->isEnabled === false) {
            return new NotificationDispatchResult(
                dispatched: false,
                executedChannels: [],
                status: 'skipped_policy_disabled',
                skippedReason: 'Policy disabled or environment scope disallows it',
            );
        }

        logger()->debug('NotificationDispatcher: conditions evaluation starting', [
            'effective_event_key' => $policy->effectiveEventKey,
        ]);

        $conditionResult = $this->conditionEvaluator->evaluate($policy->conditionsJson, $context->toArray());
        if (! $conditionResult->passed) {
            logger()->debug('NotificationDispatcher: conditions failed, skipping dispatch', [
                'event_key' => $emittedEventKey,
                'reason' => $conditionResult->reason,
            ]);

            return new NotificationDispatchResult(
                dispatched: false,
                executedChannels: [],
                status: 'skipped_conditions_failed',
                skippedReason: $conditionResult->reason ?? 'Conditions failed',
                meta: $conditionResult->metadata,
            );
        }

        $recipients = $this->recipientResolver->resolve($policy, $context);
        if ($recipients === []) {
            logger()->debug('NotificationDispatcher: no recipients resolved, skipping dispatch', [
                'event_key' => $emittedEventKey,
                'setting_id' => $policy->notificationSettingId,
            ]);

            return new NotificationDispatchResult(
                dispatched: false,
                executedChannels: [],
                status: 'skipped_no_recipients',
                skippedReason: 'No resolvable recipient targets',
            );
        }

        logger()->debug('NotificationDispatcher: channel planning', [
            'event_key' => $emittedEventKey,
            'recipient_count' => count($recipients),
        ]);

        $plan = $this->channelPlanner->plan($policy, $recipients);
        if ($plan->channelPlans === []) {
            logger()->debug('NotificationDispatcher: no channels planned, skipping dispatch', [
                'event_key' => $emittedEventKey,
            ]);

            return new NotificationDispatchResult(
                dispatched: false,
                executedChannels: [],
                status: 'skipped_no_executable_channels',
                skippedReason: 'No executable channels planned for this policy/recipients',
                meta: [
                    'planned_policy_flags' => [
                        'send_internal' => $policy->sendInternal,
                        'send_email' => $policy->sendEmail,
                        'send_sms' => $policy->sendSms,
                        'send_whatsapp' => $policy->sendWhatsapp,
                    ],
                ],
            );
        }

        logger()->debug('NotificationDispatcher: planned channels', [
            'event_key' => $emittedEventKey,
            'channels' => array_keys($plan->channelPlans),
        ]);

        $executed = [];
        $emailSuppressed = false;

        foreach ($plan->channelPlans as $channel => $channelPlan) {
            match ($channel) {
                'internal' => (function () use ($emittedEventKey, $channelPlan, $context, &$executed): void {
                    $created = $this->sendInternalAction->execute($emittedEventKey, $channelPlan, $context);
                    if ($created > 0) {
                        $executed[] = 'internal';
                    }
                })(),
                'email' => (function () use ($emittedEventKey, $channelPlan, $context, &$executed): void {
                    $emailDeliveryEnabled = (bool) ($context->getMetadata()['email_delivery_enabled'] ?? true);

                    if (! $emailDeliveryEnabled) {
                        logger()->debug('NotificationDispatcher: email suppressed by context gateway', [
                            'event_key' => $emittedEventKey,
                        ]);

                        $emailSuppressed = true;
                        return;
                    }

                    $created = $this->sendEmailAction->execute($emittedEventKey, $channelPlan, $context);
                    if ($created > 0) {
                        $executed[] = 'email';
                    }
                })(),
                default => logger()->debug('NotificationDispatcher: unsupported channel in Phase2', [
                    'channel' => $channel,
                    'event_key' => $emittedEventKey,
                ]),
            };
        }

        $dispatched = $executed !== [];
        $status = $dispatched ? (count($executed) > 1 ? 'dispatched' : 'partially_dispatched') : 'skipped_no_executable_channels';

        return new NotificationDispatchResult(
            dispatched: $dispatched,
            executedChannels: $executed,
            status: $status,
            skippedReason: $dispatched ? null : 'No channel handlers executed successfully',
            meta: [
                'planned_channels' => array_keys($plan->channelPlans),
                'email_suppressed' => $emailSuppressed,
            ]
        );
    }
}

