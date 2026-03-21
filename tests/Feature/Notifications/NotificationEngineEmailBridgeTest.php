<?php

declare(strict_types=1);

namespace Tests\Feature\Notifications;

use App\Mail\NotificationEventMail;
use App\Models\NotificationRecipient;
use App\Models\NotificationSetting;
use App\Models\SystemNotification;
use App\Models\User;
use App\Services\Notifications\Channels\SendEmailNotificationAction;
use App\Services\Notifications\Channels\SendInternalNotificationAction;
use App\Services\Notifications\NotificationChannelPlanner;
use App\Services\Notifications\NotificationConditionEvaluator;
use App\Services\Notifications\NotificationDispatcher;
use App\Services\Notifications\NotificationEngineBridge;
use App\Services\Notifications\NotificationEnginePilotGate;
use App\Services\Notifications\NotificationEventContext;
use App\Services\Notifications\NotificationPolicyResolver;
use App\Services\Notifications\NotificationRecipientResolver;
use App\Services\System\NotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Contracts\Mail\Mailer;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class NotificationEngineEmailBridgeTest extends TestCase
{
    use RefreshDatabase;

    private function makeBridge(): NotificationEngineBridge
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

        return new NotificationEngineBridge(
            pilotGate: new NotificationEnginePilotGate(),
            dispatcher: $dispatcher
        );
    }

    private function createSetting(
        string $eventKey,
        array $conditionsJson = [],
        bool $isEnabled = true,
        bool $sendEmail = true,
    ): NotificationSetting {
        return $this->createNotificationSetting([
            'event_key' => $eventKey,
            'name' => 'Test',
            'description' => null,
            'notes' => null,
            'module' => 'suppliers',
            'is_enabled' => $isEnabled,
            'send_internal' => true,
            'send_email' => $sendEmail,
            'send_broadcast' => false,
            'send_sms' => false,
            'send_whatsapp' => false,
            'delivery_mode' => 'immediate',
            'digest_frequency' => null,
            'environment_scope' => 'all',
            'conditions_json' => $conditionsJson,
            'source_event_key' => null,
            'template_event_code' => null,
        ]);
    }

    #[Test]
    public function test_pilot_event_sends_email_and_internal_and_skips_legacy_on_success(): void
    {
        Mail::fake();

        config()->set('notifications.notification_engine.enabled', true);
        config()->set('notifications.notification_engine.pilot.enabled', true);
        config()->set('notifications.notification_engine.pilot.pilot_event_keys', ['supplier.document_expiring_soon']);
        config()->set('notifications.notification_engine.fallback_to_legacy_when_skipped', true);

        $user = User::factory()->create();

        $setting = $this->createSetting(
            eventKey: 'supplier.document_expiring_soon',
            conditionsJson: [],
            isEnabled: true,
            sendEmail: true
        );

        $this->createNotificationRecipient([
            'notification_setting_id' => $setting->id,
            'recipient_type' => 'supplier_user',
            'role_name' => null,
            'user_id' => null,
            'recipient_value' => null,
            'resolver_config_json' => null,
            'channel_override' => null,
            'is_enabled' => true,
            'sort_order' => 0,
        ]);

        $bridge = $this->makeBridge();

        $eventKey = 'supplier.document_expiring_soon';

        $bridge->dispatchOrLegacy(
            $eventKey,
            new NotificationEventContext([
                'title' => 'engine-title',
                'message' => 'engine-message',
                'link' => '/x',
                'metadata' => [
                    // Phase 2.6 context gateway: default is true, but make it explicit for this test.
                    'email_delivery_enabled' => true,
                ],
                'supplier_user_ids' => [$user->id],
            ]),
            legacyDispatch: function () use ($user, $eventKey): void {
                SystemNotification::create([
                    'user_id' => $user->id,
                    'notifiable_type' => null,
                    'notifiable_id' => null,
                    'event_key' => $eventKey,
                    'title' => 'legacy',
                    'message' => 'legacy',
                    'link' => null,
                    'status' => SystemNotification::STATUS_PENDING,
                    'metadata' => [],
                ]);
            }
        );

        Mail::assertSent(NotificationEventMail::class);

        $this->assertDatabaseHas('system_notifications', [
            'user_id' => $user->id,
            'event_key' => $eventKey,
            'title' => 'engine-title',
        ]);

        $this->assertDatabaseMissing('system_notifications', [
            'user_id' => $user->id,
            'event_key' => $eventKey,
            'title' => 'legacy',
        ]);
    }

    #[Test]
    public function test_email_is_suppressed_by_context_gateway_but_internal_still_dispatches(): void
    {
        Mail::fake();

        config()->set('notifications.notification_engine.enabled', true);
        config()->set('notifications.notification_engine.pilot.enabled', true);
        config()->set('notifications.notification_engine.pilot.pilot_event_keys', ['supplier.document_expiring_soon']);

        $user = User::factory()->create();

        $setting = $this->createSetting(
            eventKey: 'supplier.document_expiring_soon',
            conditionsJson: [],
            isEnabled: true,
            sendEmail: true
        );

        $this->createNotificationRecipient([
            'notification_setting_id' => $setting->id,
            'recipient_type' => 'supplier_user',
            'role_name' => null,
            'user_id' => null,
            'recipient_value' => null,
            'resolver_config_json' => null,
            'channel_override' => null,
            'is_enabled' => true,
            'sort_order' => 0,
        ]);

        $bridge = $this->makeBridge();
        $eventKey = 'supplier.document_expiring_soon';

        $bridge->dispatchOrLegacy(
            $eventKey,
            new NotificationEventContext([
                'title' => 'engine-title',
                'message' => 'engine-message',
                'link' => '/x',
                'metadata' => [
                    'email_delivery_enabled' => false,
                ],
                'supplier_user_ids' => [$user->id],
            ]),
            legacyDispatch: function (): void {
                throw new \RuntimeException('legacyDispatch should not be called on internal success');
            }
        );

        Mail::assertNothingSent();

        $this->assertDatabaseHas('system_notifications', [
            'event_key' => $eventKey,
            'title' => 'engine-title',
        ]);
    }

    #[Test]
    public function test_email_recipient_dedupes_same_inbox_across_recipient_rules(): void
    {
        Mail::fake();

        config()->set('notifications.notification_engine.enabled', true);
        config()->set('notifications.notification_engine.pilot.enabled', true);
        config()->set('notifications.notification_engine.pilot.pilot_event_keys', ['supplier.document_expiring_soon']);

        $user = User::factory()->create();

        $setting = $this->createSetting(
            eventKey: 'supplier.document_expiring_soon',
            conditionsJson: [],
            isEnabled: true,
            sendEmail: true
        );

        // supplier_user -> resolves to the user's email
        $this->createNotificationRecipient([
            'notification_setting_id' => $setting->id,
            'recipient_type' => 'supplier_user',
            'role_name' => null,
            'user_id' => null,
            'recipient_value' => null,
            'resolver_config_json' => null,
            'channel_override' => null,
            'is_enabled' => true,
            'sort_order' => 0,
        ]);

        // explicit_email -> same inbox as supplier_user, should be deduped by SendEmailNotificationAction.
        $this->createNotificationRecipient([
            'notification_setting_id' => $setting->id,
            'recipient_type' => 'explicit_email',
            'role_name' => null,
            'user_id' => null,
            'recipient_value' => $user->email,
            'resolver_config_json' => null,
            'channel_override' => null,
            'is_enabled' => true,
            'sort_order' => 1,
        ]);

        $bridge = $this->makeBridge();
        $eventKey = 'supplier.document_expiring_soon';

        $bridge->dispatchOrLegacy(
            $eventKey,
            new NotificationEventContext([
                'title' => 'engine-title',
                'message' => 'engine-message',
                'link' => '/x',
                'metadata' => [
                    'email_delivery_enabled' => true,
                ],
                'supplier_user_ids' => [$user->id],
            ]),
            legacyDispatch: function (): void {
                throw new \RuntimeException('legacyDispatch should not be called on engine success');
            }
        );

        Mail::assertSent(NotificationEventMail::class, 1);

        $this->assertSame(1, SystemNotification::query()
            ->where('event_key', $eventKey)
            ->where('user_id', $user->id)
            ->count());
    }

    #[Test]
    public function test_fallback_to_legacy_happens_only_when_policy_is_missing(): void
    {
        Mail::fake();

        config()->set('notifications.notification_engine.enabled', true);
        config()->set('notifications.notification_engine.pilot.enabled', true);
        config()->set('notifications.notification_engine.pilot.pilot_event_keys', ['supplier.document_expiring_soon']);
        config()->set('notifications.notification_engine.fallback_to_legacy_when_skipped', true);

        $user = User::factory()->create();

        // Intentionally do not create NotificationSetting -> policy missing
        $bridge = $this->makeBridge();

        $bridge->dispatchOrLegacy(
            'supplier.document_expiring_soon',
            new NotificationEventContext([
                'title' => 'engine-title',
                'message' => 'engine-message',
                'link' => '/x',
                'metadata' => [
                    'email_delivery_enabled' => true,
                ],
                'supplier_user_ids' => [$user->id],
            ]),
            legacyDispatch: function () use ($user): void {
                SystemNotification::create([
                    'user_id' => $user->id,
                    'notifiable_type' => null,
                    'notifiable_id' => null,
                    'event_key' => 'supplier.document_expiring_soon',
                    'title' => 'legacy',
                    'message' => 'legacy',
                    'link' => null,
                    'status' => SystemNotification::STATUS_PENDING,
                    'metadata' => [],
                ]);
            }
        );

        $this->assertDatabaseHas('system_notifications', [
            'user_id' => $user->id,
            'event_key' => 'supplier.document_expiring_soon',
            'title' => 'legacy',
        ]);
    }

    #[Test]
    public function test_policy_disabled_and_conditions_failed_do_not_fallback_to_legacy(): void
    {
        Mail::fake();

        config()->set('notifications.notification_engine.enabled', true);
        config()->set('notifications.notification_engine.pilot.enabled', true);
        config()->set('notifications.notification_engine.pilot.pilot_event_keys', ['supplier.document_expiring_soon']);
        config()->set('notifications.notification_engine.fallback_to_legacy_when_skipped', true);

        $user = User::factory()->create();

        // Case A: policy disabled
        $settingDisabled = $this->createSetting(
            eventKey: 'supplier.document_expiring_soon',
            conditionsJson: [],
            isEnabled: false,
            sendEmail: true
        );

        $this->createNotificationRecipient([
            'notification_setting_id' => $settingDisabled->id,
            'recipient_type' => 'supplier_user',
            'role_name' => null,
            'user_id' => null,
            'recipient_value' => null,
            'resolver_config_json' => null,
            'channel_override' => null,
            'is_enabled' => true,
            'sort_order' => 0,
        ]);

        $bridge = $this->makeBridge();
        $bridge->dispatchOrLegacy(
            'supplier.document_expiring_soon',
            new NotificationEventContext([
                'title' => 'engine-title',
                'message' => 'engine-message',
                'link' => '/x',
                'metadata' => [
                    'email_delivery_enabled' => true,
                ],
                'supplier_user_ids' => [$user->id],
            ]),
            legacyDispatch: function (): void {
                throw new \RuntimeException('legacyDispatch should not be called for policy disabled');
            }
        );

        $this->assertSame(0, SystemNotification::query()
            ->where('event_key', 'supplier.document_expiring_soon')
            ->where('user_id', $user->id)
            ->count());

        NotificationRecipient::query()->where('notification_setting_id', $settingDisabled->id)->delete();
        $settingDisabled->delete();

        // Case B: conditions failed (fail-closed)
        $settingBadConditions = $this->createSetting(
            eventKey: 'supplier.document_expiring_soon',
            conditionsJson: ['unexpected' => 'shape'],
            isEnabled: true,
            sendEmail: true
        );

        $this->createNotificationRecipient([
            'notification_setting_id' => $settingBadConditions->id,
            'recipient_type' => 'supplier_user',
            'role_name' => null,
            'user_id' => null,
            'recipient_value' => null,
            'resolver_config_json' => null,
            'channel_override' => null,
            'is_enabled' => true,
            'sort_order' => 0,
        ]);

        $bridge->dispatchOrLegacy(
            'supplier.document_expiring_soon',
            new NotificationEventContext([
                'title' => 'engine-title',
                'message' => 'engine-message',
                'link' => '/x',
                'metadata' => [
                    'email_delivery_enabled' => true,
                ],
                'supplier_user_ids' => [$user->id],
            ]),
            legacyDispatch: function (): void {
                throw new \RuntimeException('legacyDispatch should not be called for conditions failed');
            }
        );

        $this->assertSame(0, SystemNotification::query()
            ->where('event_key', 'supplier.document_expiring_soon')
            ->where('user_id', $user->id)
            ->count());
    }

    #[Test]
    public function test_new_pilot_rfq_awarded_engine_success_suppresses_legacy(): void
    {
        Mail::fake();

        config()->set('notifications.notification_engine.enabled', true);
        config()->set('notifications.notification_engine.pilot.enabled', true);
        config()->set('notifications.notification_engine.pilot.pilot_event_keys', ['rfq.awarded']);
        config()->set('notifications.notification_engine.fallback_to_legacy_when_skipped', true);

        $user = User::factory()->create();

        $setting = $this->createSetting(
            eventKey: 'rfq.awarded',
            conditionsJson: [],
            isEnabled: true,
            sendEmail: true
        );

        $this->createNotificationRecipient([
            'notification_setting_id' => $setting->id,
            'recipient_type' => 'supplier_user',
            'role_name' => null,
            'user_id' => null,
            'recipient_value' => null,
            'resolver_config_json' => null,
            'channel_override' => null,
            'is_enabled' => true,
            'sort_order' => 0,
        ]);

        $bridge = $this->makeBridge();
        $eventKey = 'rfq.awarded';

        $title = 'engine-title';
        $message = 'engine-message';
        $link = 'https://example.com/rfqs/1';

        $bridge->dispatchOrLegacy(
            $eventKey,
            new NotificationEventContext([
                'title' => $title,
                'message' => $message,
                'link' => $link,
                'metadata' => [
                    'email_delivery_enabled' => true,
                ],
                'supplier_user_ids' => [$user->id],
            ]),
            legacyDispatch: function () use ($user, $eventKey): void {
                SystemNotification::create([
                    'user_id' => $user->id,
                    'notifiable_type' => null,
                    'notifiable_id' => null,
                    'event_key' => $eventKey,
                    'title' => 'legacy',
                    'message' => 'legacy',
                    'link' => null,
                    'status' => SystemNotification::STATUS_PENDING,
                    'metadata' => [],
                ]);
            }
        );

        Mail::assertSent(NotificationEventMail::class, function (NotificationEventMail $mail) use ($title, $message, $link): bool {
            return $mail->subjectLine === $title
                && $mail->messageLine === $message
                && $mail->actionUrl === $link;
        });

        $this->assertDatabaseHas('system_notifications', [
            'user_id' => $user->id,
            'event_key' => $eventKey,
            'title' => $title,
            'message' => $message,
        ]);

        $this->assertDatabaseMissing('system_notifications', [
            'user_id' => $user->id,
            'event_key' => $eventKey,
            'title' => 'legacy',
        ]);
    }

    #[Test]
    public function test_new_pilot_clarification_added_supplier_policy_missing_falls_back_to_legacy(): void
    {
        Mail::fake();

        config()->set('notifications.notification_engine.enabled', true);
        config()->set('notifications.notification_engine.pilot.enabled', true);
        config()->set('notifications.notification_engine.pilot.pilot_event_keys', ['clarification.added.supplier']);
        config()->set('notifications.notification_engine.fallback_to_legacy_when_skipped', true);

        $user = User::factory()->create();

        $bridge = $this->makeBridge();
        $eventKey = 'clarification.added.supplier';

        $title = 'engine-title';
        $message = 'engine-message';
        $link = 'https://example.com/rfqs/1';

        $bridge->dispatchOrLegacy(
            $eventKey,
            new NotificationEventContext([
                'title' => $title,
                'message' => $message,
                'link' => $link,
                'metadata' => [
                    'email_delivery_enabled' => true,
                ],
                'supplier_user_ids' => [$user->id],
            ]),
            legacyDispatch: function () use ($user, $eventKey): void {
                SystemNotification::create([
                    'user_id' => $user->id,
                    'notifiable_type' => null,
                    'notifiable_id' => null,
                    'event_key' => $eventKey,
                    'title' => 'legacy',
                    'message' => 'legacy',
                    'link' => null,
                    'status' => SystemNotification::STATUS_PENDING,
                    'metadata' => [],
                ]);
            }
        );

        Mail::assertNothingSent();

        $this->assertDatabaseHas('system_notifications', [
            'user_id' => $user->id,
            'event_key' => $eventKey,
            'title' => 'legacy',
        ]);
    }

    #[Test]
    public function test_new_pilot_rfq_awarded_policy_missing_falls_back_to_legacy(): void
    {
        Mail::fake();

        config()->set('notifications.notification_engine.enabled', true);
        config()->set('notifications.notification_engine.pilot.enabled', true);
        config()->set('notifications.notification_engine.pilot.pilot_event_keys', ['rfq.awarded']);
        config()->set('notifications.notification_engine.fallback_to_legacy_when_skipped', true);

        $user = User::factory()->create();
        $bridge = $this->makeBridge();
        $eventKey = 'rfq.awarded';

        $bridge->dispatchOrLegacy(
            $eventKey,
            new NotificationEventContext([
                'title' => 'engine-title',
                'message' => 'engine-message',
                'link' => 'https://example.com/rfqs/1',
                'metadata' => [
                    'email_delivery_enabled' => true,
                ],
                'supplier_user_ids' => [$user->id],
            ]),
            legacyDispatch: function () use ($user, $eventKey): void {
                SystemNotification::create([
                    'user_id' => $user->id,
                    'notifiable_type' => null,
                    'notifiable_id' => null,
                    'event_key' => $eventKey,
                    'title' => 'legacy',
                    'message' => 'legacy',
                    'link' => null,
                    'status' => SystemNotification::STATUS_PENDING,
                    'metadata' => [],
                ]);
            }
        );

        Mail::assertNothingSent();

        $this->assertDatabaseHas('system_notifications', [
            'user_id' => $user->id,
            'event_key' => $eventKey,
            'title' => 'legacy',
        ]);
    }

    #[Test]
    public function test_new_pilot_rfq_awarded_policy_disabled_does_not_fallback_to_legacy(): void
    {
        Mail::fake();

        config()->set('notifications.notification_engine.enabled', true);
        config()->set('notifications.notification_engine.pilot.enabled', true);
        config()->set('notifications.notification_engine.pilot.pilot_event_keys', ['rfq.awarded']);
        config()->set('notifications.notification_engine.fallback_to_legacy_when_skipped', true);

        $user = User::factory()->create();

        $settingDisabled = $this->createSetting(
            eventKey: 'rfq.awarded',
            conditionsJson: [],
            isEnabled: false,
            sendEmail: true
        );

        $this->createNotificationRecipient([
            'notification_setting_id' => $settingDisabled->id,
            'recipient_type' => 'supplier_user',
            'role_name' => null,
            'user_id' => null,
            'recipient_value' => null,
            'resolver_config_json' => null,
            'channel_override' => null,
            'is_enabled' => true,
            'sort_order' => 0,
        ]);

        $bridge = $this->makeBridge();
        $eventKey = 'rfq.awarded';

        $bridge->dispatchOrLegacy(
            $eventKey,
            new NotificationEventContext([
                'title' => 'engine-title',
                'message' => 'engine-message',
                'link' => 'https://example.com/rfqs/1',
                'metadata' => [
                    'email_delivery_enabled' => true,
                ],
                'supplier_user_ids' => [$user->id],
            ]),
            legacyDispatch: function (): void {
                throw new \RuntimeException('legacyDispatch should not be called when policy is disabled');
            }
        );

        Mail::assertNothingSent();

        $this->assertSame(0, SystemNotification::query()
            ->where('event_key', $eventKey)
            ->where('user_id', $user->id)
            ->count());
    }

    #[Test]
    public function test_new_pilot_clarification_added_supplier_engine_success_suppresses_legacy(): void
    {
        Mail::fake();

        config()->set('notifications.notification_engine.enabled', true);
        config()->set('notifications.notification_engine.pilot.enabled', true);
        config()->set('notifications.notification_engine.pilot.pilot_event_keys', ['clarification.added.supplier']);
        config()->set('notifications.notification_engine.fallback_to_legacy_when_skipped', true);

        $user = User::factory()->create();

        $setting = $this->createSetting(
            eventKey: 'clarification.added.supplier',
            conditionsJson: [],
            isEnabled: true,
            sendEmail: true
        );

        $this->createNotificationRecipient([
            'notification_setting_id' => $setting->id,
            'recipient_type' => 'supplier_user',
            'role_name' => null,
            'user_id' => null,
            'recipient_value' => null,
            'resolver_config_json' => null,
            'channel_override' => null,
            'is_enabled' => true,
            'sort_order' => 0,
        ]);

        $bridge = $this->makeBridge();
        $eventKey = 'clarification.added.supplier';

        $title = 'engine-title';
        $message = 'engine-message';
        $link = 'https://example.com/rfqs/1';

        $bridge->dispatchOrLegacy(
            $eventKey,
            new NotificationEventContext([
                'title' => $title,
                'message' => $message,
                'link' => $link,
                'metadata' => [
                    'email_delivery_enabled' => true,
                ],
                'supplier_user_ids' => [$user->id],
            ]),
            legacyDispatch: function (): void {
                throw new \RuntimeException('legacyDispatch should not be called on engine success');
            }
        );

        Mail::assertSent(NotificationEventMail::class, function (NotificationEventMail $mail) use ($title, $message, $link): bool {
            return $mail->subjectLine === $title
                && $mail->messageLine === $message
                && $mail->actionUrl === $link;
        });

        $this->assertDatabaseHas('system_notifications', [
            'user_id' => $user->id,
            'event_key' => $eventKey,
            'title' => $title,
            'message' => $message,
        ]);
    }

    #[Test]
    public function test_new_pilot_clarification_added_supplier_policy_disabled_does_not_fallback_to_legacy(): void
    {
        Mail::fake();

        config()->set('notifications.notification_engine.enabled', true);
        config()->set('notifications.notification_engine.pilot.enabled', true);
        config()->set('notifications.notification_engine.pilot.pilot_event_keys', ['clarification.added.supplier']);
        config()->set('notifications.notification_engine.fallback_to_legacy_when_skipped', true);

        $user = User::factory()->create();

        $settingDisabled = $this->createSetting(
            eventKey: 'clarification.added.supplier',
            conditionsJson: [],
            isEnabled: false,
            sendEmail: true
        );

        $this->createNotificationRecipient([
            'notification_setting_id' => $settingDisabled->id,
            'recipient_type' => 'supplier_user',
            'role_name' => null,
            'user_id' => null,
            'recipient_value' => null,
            'resolver_config_json' => null,
            'channel_override' => null,
            'is_enabled' => true,
            'sort_order' => 0,
        ]);

        $bridge = $this->makeBridge();
        $eventKey = 'clarification.added.supplier';

        $bridge->dispatchOrLegacy(
            $eventKey,
            new NotificationEventContext([
                'title' => 'engine-title',
                'message' => 'engine-message',
                'link' => 'https://example.com/rfqs/1',
                'metadata' => [
                    'email_delivery_enabled' => true,
                ],
                'supplier_user_ids' => [$user->id],
            ]),
            legacyDispatch: function (): void {
                throw new \RuntimeException('legacyDispatch should not be called when policy is disabled');
            }
        );

        Mail::assertNothingSent();

        $this->assertSame(0, SystemNotification::query()
            ->where('event_key', $eventKey)
            ->where('user_id', $user->id)
            ->count());
    }

    #[Test]
    public function test_new_pilot_clarification_answered_engine_success_suppresses_legacy(): void
    {
        Mail::fake();

        config()->set('notifications.notification_engine.enabled', true);
        config()->set('notifications.notification_engine.pilot.enabled', true);
        config()->set('notifications.notification_engine.pilot.pilot_event_keys', ['clarification.answered']);
        config()->set('notifications.notification_engine.fallback_to_legacy_when_skipped', true);

        $user = User::factory()->create();

        $setting = $this->createSetting(
            eventKey: 'clarification.answered',
            conditionsJson: [],
            isEnabled: true,
            sendEmail: true
        );

        $this->createNotificationRecipient([
            'notification_setting_id' => $setting->id,
            'recipient_type' => 'supplier_user',
            'role_name' => null,
            'user_id' => null,
            'recipient_value' => null,
            'resolver_config_json' => null,
            'channel_override' => null,
            'is_enabled' => true,
            'sort_order' => 0,
        ]);

        $bridge = $this->makeBridge();
        $eventKey = 'clarification.answered';

        $title = 'engine-title';
        $message = 'engine-message';
        $link = 'https://example.com/rfqs/1';

        $bridge->dispatchOrLegacy(
            $eventKey,
            new NotificationEventContext([
                'title' => $title,
                'message' => $message,
                'link' => $link,
                'metadata' => [
                    'email_delivery_enabled' => true,
                ],
                'supplier_user_ids' => [$user->id],
            ]),
            legacyDispatch: function (): void {
                throw new \RuntimeException('legacyDispatch should not be called on engine success');
            }
        );

        Mail::assertSent(NotificationEventMail::class, function (NotificationEventMail $mail) use ($title, $message, $link): bool {
            return $mail->subjectLine === $title
                && $mail->messageLine === $message
                && $mail->actionUrl === $link;
        });

        $this->assertDatabaseHas('system_notifications', [
            'user_id' => $user->id,
            'event_key' => $eventKey,
            'title' => $title,
            'message' => $message,
        ]);
    }

    #[Test]
    public function test_new_pilot_clarification_answered_policy_missing_falls_back_to_legacy(): void
    {
        Mail::fake();

        config()->set('notifications.notification_engine.enabled', true);
        config()->set('notifications.notification_engine.pilot.enabled', true);
        config()->set('notifications.notification_engine.pilot.pilot_event_keys', ['clarification.answered']);
        config()->set('notifications.notification_engine.fallback_to_legacy_when_skipped', true);

        $user = User::factory()->create();
        $bridge = $this->makeBridge();
        $eventKey = 'clarification.answered';

        $bridge->dispatchOrLegacy(
            $eventKey,
            new NotificationEventContext([
                'title' => 'engine-title',
                'message' => 'engine-message',
                'link' => 'https://example.com/rfqs/1',
                'metadata' => [
                    'email_delivery_enabled' => true,
                ],
                'supplier_user_ids' => [$user->id],
            ]),
            legacyDispatch: function () use ($user, $eventKey): void {
                SystemNotification::create([
                    'user_id' => $user->id,
                    'notifiable_type' => null,
                    'notifiable_id' => null,
                    'event_key' => $eventKey,
                    'title' => 'legacy',
                    'message' => 'legacy',
                    'link' => null,
                    'status' => SystemNotification::STATUS_PENDING,
                    'metadata' => [],
                ]);
            }
        );

        Mail::assertNothingSent();

        $this->assertDatabaseHas('system_notifications', [
            'user_id' => $user->id,
            'event_key' => $eventKey,
            'title' => 'legacy',
        ]);
    }

    #[Test]
    public function test_new_pilot_clarification_answered_disabled_does_not_fallback_to_legacy(): void
    {
        Mail::fake();

        config()->set('notifications.notification_engine.enabled', true);
        config()->set('notifications.notification_engine.pilot.enabled', true);
        config()->set('notifications.notification_engine.pilot.pilot_event_keys', ['clarification.answered']);
        config()->set('notifications.notification_engine.fallback_to_legacy_when_skipped', true);

        $user = User::factory()->create();

        $settingDisabled = $this->createSetting(
            eventKey: 'clarification.answered',
            conditionsJson: [],
            isEnabled: false,
            sendEmail: true
        );

        $this->createNotificationRecipient([
            'notification_setting_id' => $settingDisabled->id,
            'recipient_type' => 'supplier_user',
            'role_name' => null,
            'user_id' => null,
            'recipient_value' => null,
            'resolver_config_json' => null,
            'channel_override' => null,
            'is_enabled' => true,
            'sort_order' => 0,
        ]);

        $bridge = $this->makeBridge();
        $eventKey = 'clarification.answered';

        $bridge->dispatchOrLegacy(
            $eventKey,
            new NotificationEventContext([
                'title' => 'engine-title',
                'message' => 'engine-message',
                'link' => 'https://example.com/rfqs/1',
                'metadata' => [
                    'email_delivery_enabled' => true,
                ],
                'supplier_user_ids' => [$user->id],
            ]),
            legacyDispatch: function (): void {
                throw new \RuntimeException('legacyDispatch should not be called when policy is disabled');
            }
        );

        Mail::assertNothingSent();
        $this->assertSame(0, SystemNotification::query()
            ->where('event_key', $eventKey)
            ->where('user_id', $user->id)
            ->count());
    }
}

