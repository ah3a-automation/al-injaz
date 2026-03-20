<?php

declare(strict_types=1);

namespace Tests\Unit\Notifications;

use App\Services\Notifications\Channels\SendEmailNotificationAction;
use App\Services\Notifications\Channels\SendInternalNotificationAction;
use App\Services\Notifications\NotificationChannelPlanner;
use App\Services\Notifications\NotificationConditionEvaluator;
use App\Services\Notifications\NotificationDispatcher;
use App\Services\Notifications\NotificationEventContext;
use App\Services\Notifications\NotificationPolicyResolver;
use App\Services\Notifications\NotificationRecipientResolver;
use App\Services\Notifications\NotificationDispatchResult;
use App\Services\System\NotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Contracts\Mail\Mailer;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class NotificationDispatcherTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function test_dispatch_is_safe_noop_when_policy_missing(): void
    {
        $mailer = $this->app->make(Mailer::class);

        $dispatcher = new NotificationDispatcher(
            policyResolver: new NotificationPolicyResolver(),
            conditionEvaluator: new NotificationConditionEvaluator(),
            recipientResolver: new NotificationRecipientResolver(),
            channelPlanner: new NotificationChannelPlanner(),
            sendInternalAction: new SendInternalNotificationAction(new NotificationService()),
            sendEmailAction: new SendEmailNotificationAction($mailer),
        );

        $result = $dispatcher->dispatch('missing.event.key', new NotificationEventContext(['title' => 'x', 'message' => 'y']));

        $this->assertInstanceOf(NotificationDispatchResult::class, $result);
        $this->assertFalse($result->dispatched);
        $this->assertSame([], $result->executedChannels);
        $this->assertNotNull($result->skippedReason);
    }
}

