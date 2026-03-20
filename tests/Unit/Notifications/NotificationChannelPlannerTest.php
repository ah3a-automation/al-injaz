<?php

declare(strict_types=1);

namespace Tests\Unit\Notifications;

use App\Services\Notifications\NotificationChannelPlanner;
use App\Services\Notifications\ResolvedNotificationPolicyData;
use App\Services\Notifications\ResolvedRecipientData;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class NotificationChannelPlannerTest extends TestCase
{
    #[Test]
    public function test_explicit_email_is_routed_to_email_only(): void
    {
        $policy = new ResolvedNotificationPolicyData(
            emittedEventKey: 'supplier.registered',
            effectiveEventKey: 'supplier.registered',
            canonicalEventKey: 'supplier.registered',
            notificationSettingId: '00000000-0000-0000-0000-000000000001',
            module: 'suppliers',
            isEnabled: true,
            sendInternal: true,
            sendEmail: true,
            sendSms: false,
            sendWhatsapp: false,
            deliveryMode: 'immediate',
            digestFrequency: null,
            environmentScope: 'all',
            conditionsJson: [],
            templateEventCode: null,
            sourceEventKey: null,
            metadata: [],
        );

        $recipients = [
            new ResolvedRecipientData(
                recipientType: 'user',
                userId: 1,
                email: 'a@b.com',
                channelOverride: null,
                resolverMetadata: [],
            ),
            new ResolvedRecipientData(
                recipientType: 'explicit_email',
                userId: null,
                email: 'c@d.com',
                channelOverride: null,
                resolverMetadata: [],
            ),
        ];

        $planner = new NotificationChannelPlanner();
        $plan = $planner->plan($policy, $recipients);

        $this->assertArrayHasKey('internal', $plan->channelPlans);
        $this->assertArrayHasKey('email', $plan->channelPlans);

        $internalRecipients = $plan->channelPlans['internal']->recipients;
        $this->assertCount(1, $internalRecipients);
        $this->assertSame('user', $internalRecipients[0]->recipientType);

        $emailRecipients = $plan->channelPlans['email']->recipients;
        $this->assertCount(2, $emailRecipients);
    }

    #[Test]
    public function test_recipient_channel_override_controls_routing(): void
    {
        $policy = new ResolvedNotificationPolicyData(
            emittedEventKey: 'supplier.registered',
            effectiveEventKey: 'supplier.registered',
            canonicalEventKey: 'supplier.registered',
            notificationSettingId: '00000000-0000-0000-0000-000000000002',
            module: 'suppliers',
            isEnabled: true,
            sendInternal: true,
            sendEmail: true,
            sendSms: false,
            sendWhatsapp: false,
            deliveryMode: 'immediate',
            digestFrequency: null,
            environmentScope: 'all',
            conditionsJson: [],
            templateEventCode: null,
            sourceEventKey: null,
            metadata: [],
        );

        $recipients = [
            new ResolvedRecipientData(
                recipientType: 'user',
                userId: 2,
                email: 'x@y.com',
                channelOverride: 'email',
                resolverMetadata: [],
            ),
        ];

        $planner = new NotificationChannelPlanner();
        $plan = $planner->plan($policy, $recipients);

        $this->assertArrayNotHasKey('internal', $plan->channelPlans);
        $this->assertArrayHasKey('email', $plan->channelPlans);
        $this->assertCount(1, $plan->channelPlans['email']->recipients);
    }
}

