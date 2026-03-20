<?php

declare(strict_types=1);

namespace Tests\Feature\Notifications;

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
use App\Services\Notifications\NotificationDispatchResult;
use App\Services\System\NotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Contracts\Mail\Mailer;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

final class NotificationEngineBridgeTest extends TestCase
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
            sendEmailAction: new SendEmailNotificationAction($mailer)
        );

        return new NotificationEngineBridge(
            pilotGate: new NotificationEnginePilotGate(),
            dispatcher: $dispatcher
        );
    }

    private function createSettingWithSupplierUserRecipient(
        string $eventKey,
        array $conditionsJson = [],
        bool $isEnabled = true
    ): NotificationSetting {
        return NotificationSetting::create([
            'event_key' => $eventKey,
            'name' => 'Test',
            'description' => null,
            'notes' => null,
            'module' => 'suppliers',
            'is_enabled' => $isEnabled,
            'send_internal' => true,
            'send_email' => false,
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

    private function createSettingWithCreatorRecipient(
        string $eventKey,
        array $conditionsJson = [],
        bool $isEnabled = true
    ): NotificationSetting {
        return NotificationSetting::create([
            'event_key' => $eventKey,
            'name' => 'Test',
            'description' => null,
            'notes' => null,
            'module' => 'rfqs',
            'is_enabled' => $isEnabled,
            'send_internal' => true,
            'send_email' => false,
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

    private function createSettingWithApproverRecipient(
        string $eventKey,
        string $permissionName,
        bool $isEnabled = true
    ): NotificationSetting {
        $setting = NotificationSetting::create([
            'event_key' => $eventKey,
            'name' => 'Test',
            'description' => null,
            'notes' => null,
            'module' => 'suppliers',
            'is_enabled' => $isEnabled,
            'send_internal' => true,
            'send_email' => false,
            'send_broadcast' => false,
            'send_sms' => false,
            'send_whatsapp' => false,
            'delivery_mode' => 'immediate',
            'digest_frequency' => null,
            'environment_scope' => 'all',
            'conditions_json' => [],
            'source_event_key' => null,
            'template_event_code' => null,
        ]);

        NotificationRecipient::create([
            'notification_setting_id' => $setting->id,
            'recipient_type' => 'approver',
            'role_name' => $permissionName,
            'user_id' => null,
            'recipient_value' => null,
            'resolver_config_json' => null,
            'channel_override' => null,
            'is_enabled' => true,
            'sort_order' => 0,
        ]);

        return $setting;
    }

    private function createSettingWithAssignedUserRecipient(
        string $eventKey,
        bool $isEnabled = true
    ): NotificationSetting {
        return NotificationSetting::create([
            'event_key' => $eventKey,
            'name' => 'Test',
            'description' => null,
            'notes' => null,
            'module' => 'tasks',
            'is_enabled' => $isEnabled,
            'send_internal' => true,
            'send_email' => false,
            'send_broadcast' => false,
            'send_sms' => false,
            'send_whatsapp' => false,
            'delivery_mode' => 'immediate',
            'digest_frequency' => null,
            'environment_scope' => 'all',
            'conditions_json' => [],
            'source_event_key' => null,
            'template_event_code' => null,
        ]);
    }

    #[Test]
    public function test_gate_disabled_uses_legacy_path_only(): void
    {
        config()->set('notifications.notification_engine.enabled', false);

        $user = User::factory()->create();
        $bridge = $this->makeBridge();

        $eventKey = 'supplier.document_expiring_soon';

        $bridge->dispatchOrLegacy(
            $eventKey,
            new NotificationEventContext([
                'title' => 't',
                'message' => 'm',
                'link' => '/x',
                'metadata' => [],
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

        $this->assertDatabaseHas('system_notifications', [
            'user_id' => $user->id,
            'event_key' => $eventKey,
            'title' => 'legacy',
        ]);
    }

    #[Test]
    public function test_gate_enabled_engine_dispatches_and_legacy_skips_on_success(): void
    {
        config()->set('notifications.notification_engine.enabled', true);
        config()->set('notifications.notification_engine.pilot.enabled', true);
        config()->set('notifications.notification_engine.pilot.pilot_event_keys', ['supplier.document_expiring_soon']);
        config()->set('notifications.notification_engine.fallback_to_legacy_when_skipped', false);

        $user = User::factory()->create();
        $setting = $this->createSettingWithSupplierUserRecipient('supplier.document_expiring_soon', conditionsJson: []);

        NotificationRecipient::create([
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
                'metadata' => [],
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

        $count = SystemNotification::query()
            ->where('user_id', $user->id)
            ->where('event_key', $eventKey)
            ->count();

        $this->assertSame(1, $count, 'Engine should dispatch once and suppress legacy to prevent duplicates.');

        $this->assertDatabaseHas('system_notifications', [
            'user_id' => $user->id,
            'event_key' => $eventKey,
            'title' => 'engine-title',
        ]);
    }

    #[Test]
    public function test_invalid_conditions_fail_closed_and_fallback_disabled_blocks_legacy(): void
    {
        config()->set('notifications.notification_engine.enabled', true);
        config()->set('notifications.notification_engine.pilot.enabled', true);
        config()->set('notifications.notification_engine.pilot.pilot_event_keys', ['supplier.document_expiring_soon']);
        config()->set('notifications.notification_engine.fallback_to_legacy_when_skipped', false);

        $user = User::factory()->create();
        $setting = $this->createSettingWithSupplierUserRecipient(
            'supplier.document_expiring_soon',
            conditionsJson: ['unexpected' => 'shape'],
            isEnabled: true
        );

        NotificationRecipient::create([
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
                'metadata' => [],
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

        $count = SystemNotification::query()
            ->where('user_id', $user->id)
            ->where('event_key', $eventKey)
            ->count();

        $this->assertSame(0, $count, 'With fail-closed invalid conditions + fallback disabled, neither engine nor legacy should create notifications.');
    }

    #[Test]
    public function test_non_pilot_event_uses_legacy_path(): void
    {
        config()->set('notifications.notification_engine.enabled', true);
        config()->set('notifications.notification_engine.pilot.enabled', true);
        config()->set('notifications.notification_engine.pilot.pilot_event_keys', ['rfq.issued']);
        config()->set('notifications.notification_engine.fallback_to_legacy_when_skipped', false);

        $user = User::factory()->create();
        $bridge = $this->makeBridge();

        $eventKey = 'supplier.document_expiring_soon';

        $bridge->dispatchOrLegacy(
            $eventKey,
            new NotificationEventContext([
                'title' => 't',
                'message' => 'm',
                'link' => '/x',
                'metadata' => [],
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

        $this->assertDatabaseHas('system_notifications', [
            'user_id' => $user->id,
            'event_key' => $eventKey,
            'title' => 'legacy',
        ]);
    }

    #[Test]
    public function test_gate_enabled_engine_dispatches_rfq_evaluation_and_skips_legacy(): void
    {
        config()->set('notifications.notification_engine.enabled', true);
        config()->set('notifications.notification_engine.pilot.enabled', true);
        config()->set('notifications.notification_engine.pilot.pilot_event_keys', ['rfq.evaluation']);
        config()->set('notifications.notification_engine.fallback_to_legacy_when_skipped', false);

        $user = User::factory()->create();
        $setting = $this->createSettingWithCreatorRecipient('rfq.evaluation');

        NotificationRecipient::create([
            'notification_setting_id' => $setting->id,
            'recipient_type' => 'creator',
            'role_name' => null,
            'user_id' => null,
            'recipient_value' => null,
            'resolver_config_json' => null,
            'channel_override' => null,
            'is_enabled' => true,
            'sort_order' => 0,
        ]);

        $bridge = $this->makeBridge();
        $eventKey = 'rfq.evaluation';

        $bridge->dispatchOrLegacy(
            $eventKey,
            new NotificationEventContext([
                'title' => 'engine-title',
                'message' => 'engine-message',
                'link' => '/x',
                'metadata' => [],
                'created_by_user_id' => $user->id,
                'actor_id' => $user->id,
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
    public function test_gate_enabled_engine_dispatches_quote_submitted_and_skips_legacy(): void
    {
        config()->set('notifications.notification_engine.enabled', true);
        config()->set('notifications.notification_engine.pilot.enabled', true);
        config()->set('notifications.notification_engine.pilot.pilot_event_keys', ['quote.submitted']);
        config()->set('notifications.notification_engine.fallback_to_legacy_when_skipped', false);

        $user = User::factory()->create();
        $setting = $this->createSettingWithCreatorRecipient('quote.submitted');

        NotificationRecipient::create([
            'notification_setting_id' => $setting->id,
            'recipient_type' => 'creator',
            'role_name' => null,
            'user_id' => null,
            'recipient_value' => null,
            'resolver_config_json' => null,
            'channel_override' => null,
            'is_enabled' => true,
            'sort_order' => 0,
        ]);

        $bridge = $this->makeBridge();
        $eventKey = 'quote.submitted';

        $bridge->dispatchOrLegacy(
            $eventKey,
            new NotificationEventContext([
                'title' => 'engine-title',
                'message' => 'engine-message',
                'link' => '/x',
                'metadata' => [],
                'created_by_user_id' => $user->id,
                'actor_id' => $user->id,
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
    public function test_gate_enabled_engine_dispatches_quote_revised_and_skips_legacy(): void
    {
        config()->set('notifications.notification_engine.enabled', true);
        config()->set('notifications.notification_engine.pilot.enabled', true);
        config()->set('notifications.notification_engine.pilot.pilot_event_keys', ['quote.revised']);
        config()->set('notifications.notification_engine.fallback_to_legacy_when_skipped', false);

        $user = User::factory()->create();
        $setting = $this->createSettingWithCreatorRecipient('quote.revised');

        NotificationRecipient::create([
            'notification_setting_id' => $setting->id,
            'recipient_type' => 'creator',
            'role_name' => null,
            'user_id' => null,
            'recipient_value' => null,
            'resolver_config_json' => null,
            'channel_override' => null,
            'is_enabled' => true,
            'sort_order' => 0,
        ]);

        $bridge = $this->makeBridge();
        $eventKey = 'quote.revised';

        $bridge->dispatchOrLegacy(
            $eventKey,
            new NotificationEventContext([
                'title' => 'engine-title',
                'message' => 'engine-message',
                'link' => '/x',
                'metadata' => [],
                'created_by_user_id' => $user->id,
                'actor_id' => $user->id,
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
    public function test_gate_enabled_engine_dispatches_clarification_made_public_and_skips_legacy(): void
    {
        config()->set('notifications.notification_engine.enabled', true);
        config()->set('notifications.notification_engine.pilot.enabled', true);
        config()->set('notifications.notification_engine.pilot.pilot_event_keys', ['clarification.made_public']);
        config()->set('notifications.notification_engine.fallback_to_legacy_when_skipped', false);

        $user1 = User::factory()->create();
        $user2 = User::factory()->create();
        $setting = $this->createSettingWithSupplierUserRecipient('clarification.made_public');

        NotificationRecipient::create([
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
        $eventKey = 'clarification.made_public';

        $bridge->dispatchOrLegacy(
            $eventKey,
            new NotificationEventContext([
                'title' => 'engine-title',
                'message' => 'engine-message',
                'link' => '/x',
                'metadata' => [],
                'supplier_user_ids' => [$user1->id, $user2->id],
            ]),
            legacyDispatch: function () use ($user1, $user2, $eventKey): void {
                foreach ([$user1, $user2] as $u) {
                    SystemNotification::create([
                        'user_id' => $u->id,
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
            }
        );

        foreach ([$user1, $user2] as $u) {
            $this->assertDatabaseHas('system_notifications', [
                'user_id' => $u->id,
                'event_key' => $eventKey,
                'title' => 'engine-title',
            ]);

            $this->assertDatabaseMissing('system_notifications', [
                'user_id' => $u->id,
                'event_key' => $eventKey,
                'title' => 'legacy',
            ]);
        }
    }

    #[Test]
    public function test_gate_enabled_engine_dispatches_supplier_document_expiring_soon_internal_and_skips_legacy(): void
    {
        config()->set('notifications.notification_engine.enabled', true);
        config()->set('notifications.notification_engine.pilot.enabled', true);
        config()->set('notifications.notification_engine.pilot.pilot_event_keys', ['supplier.document_expiring_soon.internal']);
        config()->set('notifications.notification_engine.fallback_to_legacy_when_skipped', false);

        $permission = Permission::findOrCreate('suppliers.approve');
        $role = Role::findOrCreate('procurement');
        $role->givePermissionTo($permission->name);

        $user = User::factory()->create();
        $user->assignRole($role->name);
        $otherUser = User::factory()->create();

        $eventKey = 'supplier.document_expiring_soon.internal';
        $this->createSettingWithApproverRecipient($eventKey, $permission->name);

        $bridge = $this->makeBridge();

        $bridge->dispatchOrLegacy(
            $eventKey,
            new NotificationEventContext([
                'title' => 'engine-title',
                'message' => 'engine-message',
                'link' => '/x',
                'metadata' => [],
            ]),
            legacyDispatch: function () use ($user, $eventKey): void {
                SystemNotification::create([
                    'user_id' => $user->id,
                    'notifiable_type' => null,
                    'notifiable_id' => null,
                    'event_key' => $eventKey,
                    'title' => 'legacy-title',
                    'message' => 'legacy-message',
                    'link' => null,
                    'status' => SystemNotification::STATUS_PENDING,
                    'metadata' => [],
                ]);
            }
        );

        $this->assertDatabaseHas('system_notifications', [
            'user_id' => $user->id,
            'event_key' => $eventKey,
            'title' => 'engine-title',
        ]);

        $this->assertDatabaseMissing('system_notifications', [
            'user_id' => $user->id,
            'event_key' => $eventKey,
            'title' => 'legacy-title',
        ]);

        $this->assertDatabaseMissing('system_notifications', [
            'user_id' => $otherUser->id,
            'event_key' => $eventKey,
            'title' => 'engine-title',
        ]);

        $this->assertDatabaseMissing('system_notifications', [
            'user_id' => $otherUser->id,
            'event_key' => $eventKey,
            'title' => 'legacy-title',
        ]);
    }

    #[Test]
    public function test_gate_enabled_engine_policy_disabled_blocks_supplier_document_expiring_soon_internal_and_legacy(): void
    {
        config()->set('notifications.notification_engine.enabled', true);
        config()->set('notifications.notification_engine.pilot.enabled', true);
        config()->set('notifications.notification_engine.pilot.pilot_event_keys', ['supplier.document_expiring_soon.internal']);
        config()->set('notifications.notification_engine.fallback_to_legacy_when_skipped', true);

        $permission = Permission::findOrCreate('suppliers.approve');
        $role = Role::findOrCreate('procurement');
        $role->givePermissionTo($permission->name);

        $user = User::factory()->create();
        $user->assignRole($role->name);

        $otherUser = User::factory()->create();

        $supplierId = 'supplier-uuid';
        $eventKey = 'supplier.document_expiring_soon.internal';

        $this->createSettingWithApproverRecipient($eventKey, $permission->name, isEnabled: false);

        $bridge = $this->makeBridge();

        $bridge->dispatchOrLegacy(
            $eventKey,
            new NotificationEventContext([
                'title' => 'engine-title',
                'message' => 'engine-message',
                'link' => '/x',
                'metadata' => [
                    'supplier_id' => $supplierId,
                ],
            ]),
            legacyDispatch: function () use ($user, $eventKey, $supplierId): void {
                SystemNotification::create([
                    'user_id' => $user->id,
                    'notifiable_type' => null,
                    'notifiable_id' => null,
                    'event_key' => $eventKey,
                    'title' => 'legacy-title',
                    'message' => 'legacy-message',
                    'link' => null,
                    'status' => SystemNotification::STATUS_PENDING,
                    'metadata' => [
                        'supplier_id' => $supplierId,
                    ],
                ]);
            }
        );

        $this->assertSame(
            0,
            SystemNotification::query()
                ->where('user_id', $user->id)
                ->where('event_key', $eventKey)
                ->count()
        );

        $this->assertDatabaseMissing('system_notifications', [
            'user_id' => $user->id,
            'event_key' => $eventKey,
            'title' => 'engine-title',
        ]);

        $this->assertDatabaseMissing('system_notifications', [
            'user_id' => $user->id,
            'event_key' => $eventKey,
            'title' => 'legacy-title',
        ]);

        $this->assertDatabaseMissing('system_notifications', [
            'user_id' => $otherUser->id,
            'event_key' => $eventKey,
            'title' => 'engine-title',
        ]);

        $this->assertDatabaseMissing('system_notifications', [
            'user_id' => $otherUser->id,
            'event_key' => $eventKey,
            'title' => 'legacy-title',
        ]);
    }

    #[Test]
    public function test_gate_enabled_engine_policy_missing_falls_back_to_legacy_for_supplier_document_expiring_soon_internal(): void
    {
        config()->set('notifications.notification_engine.enabled', true);
        config()->set('notifications.notification_engine.pilot.enabled', true);
        config()->set('notifications.notification_engine.pilot.pilot_event_keys', ['supplier.document_expiring_soon.internal']);
        config()->set('notifications.notification_engine.fallback_to_legacy_when_skipped', true);

        $permission = Permission::findOrCreate('suppliers.approve');
        $role = Role::findOrCreate('procurement');
        $role->givePermissionTo($permission->name);

        $user = User::factory()->create();
        $user->assignRole($role->name);

        $otherUser = User::factory()->create();

        $supplierId = 'supplier-uuid';
        $eventKey = 'supplier.document_expiring_soon.internal';

        $bridge = $this->makeBridge();

        $bridge->dispatchOrLegacy(
            $eventKey,
            new NotificationEventContext([
                'title' => 'engine-title',
                'message' => 'engine-message',
                'link' => '/x',
                'metadata' => [
                    'supplier_id' => $supplierId,
                ],
            ]),
            legacyDispatch: function () use ($user, $eventKey, $supplierId): void {
                SystemNotification::create([
                    'user_id' => $user->id,
                    'notifiable_type' => null,
                    'notifiable_id' => null,
                    'event_key' => $eventKey,
                    'title' => 'legacy-title',
                    'message' => 'legacy-message',
                    'link' => null,
                    'status' => SystemNotification::STATUS_PENDING,
                    'metadata' => [
                        'supplier_id' => $supplierId,
                    ],
                ]);
            }
        );

        $this->assertDatabaseHas('system_notifications', [
            'user_id' => $user->id,
            'event_key' => $eventKey,
            'title' => 'legacy-title',
        ]);

        $this->assertDatabaseMissing('system_notifications', [
            'user_id' => $user->id,
            'event_key' => $eventKey,
            'title' => 'engine-title',
        ]);

        $this->assertDatabaseMissing('system_notifications', [
            'user_id' => $otherUser->id,
            'event_key' => $eventKey,
        ]);
    }

    #[Test]
    public function test_gate_enabled_engine_dispatches_supplier_document_expiring_soon_internal_dedupe_by_supplier_id_and_skips_legacy(): void
    {
        config()->set('notifications.notification_engine.enabled', true);
        config()->set('notifications.notification_engine.pilot.enabled', true);
        config()->set('notifications.notification_engine.pilot.pilot_event_keys', ['supplier.document_expiring_soon.internal']);
        config()->set('notifications.notification_engine.fallback_to_legacy_when_skipped', false);

        $permission = Permission::findOrCreate('suppliers.approve');
        $role = Role::findOrCreate('procurement');
        $role->givePermissionTo($permission->name);

        $user = User::factory()->create();
        $user->assignRole($role->name);

        $supplierId = 'supplier-uuid';
        $eventKey = 'supplier.document_expiring_soon.internal';

        $this->createSettingWithApproverRecipient($eventKey, $permission->name, isEnabled: true);

        // Seed an existing internal notification with the same dedupe metadata.
        SystemNotification::create([
            'user_id' => $user->id,
            'notifiable_type' => null,
            'notifiable_id' => null,
            'event_key' => $eventKey,
            'title' => 'engine-title',
            'message' => 'engine-message',
            'link' => '/x',
            'status' => SystemNotification::STATUS_PENDING,
            'metadata' => [
                'supplier_id' => $supplierId,
            ],
        ]);

        $bridge = $this->makeBridge();

        $bridge->dispatchOrLegacy(
            $eventKey,
            new NotificationEventContext([
                'title' => 'engine-title',
                'message' => 'engine-message',
                'link' => '/x',
                'metadata' => [
                    'supplier_id' => $supplierId,
                ],
            ]),
            legacyDispatch: function () use ($user, $eventKey): void {
                SystemNotification::create([
                    'user_id' => $user->id,
                    'notifiable_type' => null,
                    'notifiable_id' => null,
                    'event_key' => $eventKey,
                    'title' => 'legacy-title',
                    'message' => 'legacy-message',
                    'link' => null,
                    'status' => SystemNotification::STATUS_PENDING,
                    'metadata' => [],
                ]);
            }
        );

        $this->assertSame(
            1,
            SystemNotification::query()
                ->where('user_id', $user->id)
                ->where('event_key', $eventKey)
                ->count()
        );

        $this->assertDatabaseMissing('system_notifications', [
            'user_id' => $user->id,
            'event_key' => $eventKey,
            'title' => 'legacy-title',
        ]);
    }

    #[Test]
    public function test_gate_enabled_engine_dispatches_supplier_document_expired_internal_and_skips_legacy(): void
    {
        config()->set('notifications.notification_engine.enabled', true);
        config()->set('notifications.notification_engine.pilot.enabled', true);
        config()->set('notifications.notification_engine.pilot.pilot_event_keys', ['supplier.document_expired.internal']);
        config()->set('notifications.notification_engine.fallback_to_legacy_when_skipped', false);

        $permission = Permission::findOrCreate('suppliers.approve');
        $role = Role::findOrCreate('procurement');
        $role->givePermissionTo($permission->name);

        $user = User::factory()->create();
        $user->assignRole($role->name);

        $eventKey = 'supplier.document_expired.internal';
        $this->createSettingWithApproverRecipient($eventKey, $permission->name);

        $bridge = $this->makeBridge();

        $bridge->dispatchOrLegacy(
            $eventKey,
            new NotificationEventContext([
                'title' => 'engine-title',
                'message' => 'engine-message',
                'link' => '/x',
                'metadata' => [],
            ]),
            legacyDispatch: function () use ($user, $eventKey): void {
                SystemNotification::create([
                    'user_id' => $user->id,
                    'notifiable_type' => null,
                    'notifiable_id' => null,
                    'event_key' => $eventKey,
                    'title' => 'legacy-title',
                    'message' => 'legacy-message',
                    'link' => null,
                    'status' => SystemNotification::STATUS_PENDING,
                    'metadata' => [],
                ]);
            }
        );

        $this->assertDatabaseHas('system_notifications', [
            'user_id' => $user->id,
            'event_key' => $eventKey,
            'title' => 'engine-title',
        ]);

        $this->assertDatabaseMissing('system_notifications', [
            'user_id' => $user->id,
            'event_key' => $eventKey,
            'title' => 'legacy-title',
        ]);
    }

    #[Test]
    public function test_gate_enabled_engine_dispatches_task_assigned_and_skips_legacy(): void
    {
        config()->set('notifications.notification_engine.enabled', true);
        config()->set('notifications.notification_engine.pilot.enabled', true);
        config()->set('notifications.notification_engine.pilot.pilot_event_keys', ['task.assigned']);
        config()->set('notifications.notification_engine.fallback_to_legacy_when_skipped', false);

        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        $taskId = 'task-uuid';

        $setting = $this->createSettingWithAssignedUserRecipient('task.assigned');

        NotificationRecipient::create([
            'notification_setting_id' => $setting->id,
            'recipient_type' => 'assigned_user',
            'role_name' => null,
            'user_id' => null,
            'recipient_value' => null,
            'resolver_config_json' => null,
            'channel_override' => null,
            'is_enabled' => true,
            'sort_order' => 0,
        ]);

        $bridge = $this->makeBridge();
        $eventKey = 'task.assigned';

        $bridge->dispatchOrLegacy(
            $eventKey,
            new NotificationEventContext([
                'title' => 'engine-title',
                'message' => 'engine-message',
                'link' => '/tasks/1',
                'metadata' => [
                    'task_id' => $taskId,
                ],
                'assigned_user_ids' => [$user->id],
            ]),
            legacyDispatch: function () use ($user, $eventKey): void {
                SystemNotification::create([
                    'user_id' => $user->id,
                    'notifiable_type' => null,
                    'notifiable_id' => null,
                    'event_key' => $eventKey,
                    'title' => 'legacy-title',
                    'message' => 'legacy-message',
                    'link' => null,
                    'status' => SystemNotification::STATUS_PENDING,
                    'metadata' => [],
                ]);
            }
        );

        $this->assertDatabaseHas('system_notifications', [
            'user_id' => $user->id,
            'event_key' => $eventKey,
            'title' => 'engine-title',
        ]);

        $this->assertDatabaseMissing('system_notifications', [
            'user_id' => $user->id,
            'event_key' => $eventKey,
            'title' => 'legacy-title',
        ]);

        $this->assertDatabaseMissing('system_notifications', [
            'user_id' => $otherUser->id,
            'event_key' => $eventKey,
            'title' => 'engine-title',
        ]);

        $this->assertDatabaseMissing('system_notifications', [
            'user_id' => $otherUser->id,
            'event_key' => $eventKey,
            'title' => 'legacy-title',
        ]);
    }

    #[Test]
    public function test_gate_enabled_engine_policy_disabled_blocks_task_assigned_and_legacy(): void
    {
        config()->set('notifications.notification_engine.enabled', true);
        config()->set('notifications.notification_engine.pilot.enabled', true);
        config()->set('notifications.notification_engine.pilot.pilot_event_keys', ['task.assigned']);
        config()->set('notifications.notification_engine.fallback_to_legacy_when_skipped', true);

        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        $taskId = 'task-uuid';
        $eventKey = 'task.assigned';

        $setting = $this->createSettingWithAssignedUserRecipient($eventKey, isEnabled: false);

        NotificationRecipient::create([
            'notification_setting_id' => $setting->id,
            'recipient_type' => 'assigned_user',
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
            $eventKey,
            new NotificationEventContext([
                'title' => 'engine-title',
                'message' => 'engine-message',
                'link' => '/tasks/1',
                'metadata' => [
                    'task_id' => $taskId,
                ],
                'assigned_user_ids' => [$user->id],
            ]),
            legacyDispatch: function () use ($user, $eventKey, $taskId): void {
                SystemNotification::create([
                    'user_id' => $user->id,
                    'notifiable_type' => null,
                    'notifiable_id' => null,
                    'event_key' => $eventKey,
                    'title' => 'legacy-title',
                    'message' => 'legacy-message',
                    'link' => null,
                    'status' => SystemNotification::STATUS_PENDING,
                    'metadata' => [
                        'task_id' => $taskId,
                    ],
                ]);
            }
        );

        $this->assertSame(
            0,
            SystemNotification::query()
                ->where('user_id', $user->id)
                ->where('event_key', $eventKey)
                ->count()
        );

        $this->assertDatabaseMissing('system_notifications', [
            'user_id' => $otherUser->id,
            'event_key' => $eventKey,
            'title' => 'engine-title',
        ]);

        $this->assertDatabaseMissing('system_notifications', [
            'user_id' => $otherUser->id,
            'event_key' => $eventKey,
            'title' => 'legacy-title',
        ]);
    }

    #[Test]
    public function test_gate_enabled_engine_policy_missing_falls_back_to_legacy(): void
    {
        config()->set('notifications.notification_engine.enabled', true);
        config()->set('notifications.notification_engine.pilot.enabled', true);
        config()->set('notifications.notification_engine.pilot.pilot_event_keys', ['task.assigned']);
        config()->set('notifications.notification_engine.fallback_to_legacy_when_skipped', true);

        $user = User::factory()->create();
        $eventKey = 'task.assigned';

        $bridge = $this->makeBridge();

        $bridge->dispatchOrLegacy(
            $eventKey,
            new NotificationEventContext([
                'title' => 'engine-title',
                'message' => 'engine-message',
                'link' => '/tasks/1',
                'metadata' => [
                    'task_id' => 'task-uuid',
                ],
                'assigned_user_ids' => [$user->id],
            ]),
            legacyDispatch: function () use ($user, $eventKey): void {
                SystemNotification::create([
                    'user_id' => $user->id,
                    'notifiable_type' => null,
                    'notifiable_id' => null,
                    'event_key' => $eventKey,
                    'title' => 'legacy-title',
                    'message' => 'legacy-message',
                    'link' => null,
                    'status' => SystemNotification::STATUS_PENDING,
                    'metadata' => [],
                ]);
            }
        );

        $this->assertDatabaseHas('system_notifications', [
            'user_id' => $user->id,
            'event_key' => $eventKey,
            'title' => 'legacy-title',
        ]);
        $this->assertDatabaseMissing('system_notifications', [
            'user_id' => $user->id,
            'event_key' => $eventKey,
            'title' => 'engine-title',
        ]);
    }

    #[Test]
    public function test_engine_task_assigned_dedupe_uses_task_id_and_skips_duplicate_creation(): void
    {
        config()->set('notifications.notification_engine.enabled', true);
        config()->set('notifications.notification_engine.pilot.enabled', true);
        config()->set('notifications.notification_engine.pilot.pilot_event_keys', ['task.assigned']);
        config()->set('notifications.notification_engine.fallback_to_legacy_when_skipped', false);

        $user = User::factory()->create();
        $taskId = 'task-uuid';
        $eventKey = 'task.assigned';

        $setting = $this->createSettingWithAssignedUserRecipient($eventKey);

        NotificationRecipient::create([
            'notification_setting_id' => $setting->id,
            'recipient_type' => 'assigned_user',
            'role_name' => null,
            'user_id' => null,
            'recipient_value' => null,
            'resolver_config_json' => null,
            'channel_override' => null,
            'is_enabled' => true,
            'sort_order' => 0,
        ]);

        SystemNotification::create([
            'user_id' => $user->id,
            'notifiable_type' => null,
            'notifiable_id' => null,
            'event_key' => $eventKey,
            'title' => 'engine-title',
            'message' => 'engine-message',
            'link' => '/tasks/1',
            'status' => SystemNotification::STATUS_PENDING,
            'metadata' => [
                'task_id' => $taskId,
            ],
        ]);

        $bridge = $this->makeBridge();

        $bridge->dispatchOrLegacy(
            $eventKey,
            new NotificationEventContext([
                'title' => 'engine-title',
                'message' => 'engine-message',
                'link' => '/tasks/1',
                'metadata' => [
                    'task_id' => $taskId,
                ],
                'assigned_user_ids' => [$user->id],
            ]),
            legacyDispatch: function () use ($user, $eventKey): void {
                SystemNotification::create([
                    'user_id' => $user->id,
                    'notifiable_type' => null,
                    'notifiable_id' => null,
                    'event_key' => $eventKey,
                    'title' => 'legacy-title',
                    'message' => 'legacy-message',
                    'link' => null,
                    'status' => SystemNotification::STATUS_PENDING,
                    'metadata' => [],
                ]);
            }
        );

        $count = SystemNotification::query()
            ->where('user_id', $user->id)
            ->where('event_key', $eventKey)
            ->count();

        $this->assertSame(1, $count);
        $this->assertDatabaseMissing('system_notifications', [
            'user_id' => $user->id,
            'event_key' => $eventKey,
            'title' => 'legacy-title',
        ]);
    }

    #[Test]
    public function test_gate_enabled_engine_dispatches_task_due_soon_and_skips_legacy(): void
    {
        config()->set('notifications.notification_engine.enabled', true);
        config()->set('notifications.notification_engine.pilot.enabled', true);
        config()->set('notifications.notification_engine.pilot.pilot_event_keys', ['task.due_soon']);
        config()->set('notifications.notification_engine.fallback_to_legacy_when_skipped', false);

        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        $taskId = 'task-uuid';

        $eventKey = 'task.due_soon';
        $setting = $this->createSettingWithAssignedUserRecipient($eventKey);

        NotificationRecipient::create([
            'notification_setting_id' => $setting->id,
            'recipient_type' => 'assigned_user',
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
            $eventKey,
            new NotificationEventContext([
                'title' => 'engine-title',
                'message' => 'engine-message',
                'link' => '/tasks/1',
                'metadata' => [
                    'task_id' => $taskId,
                ],
                'assigned_user_ids' => [$user->id],
            ]),
            legacyDispatch: function () use ($user, $eventKey): void {
                SystemNotification::create([
                    'user_id' => $user->id,
                    'notifiable_type' => null,
                    'notifiable_id' => null,
                    'event_key' => $eventKey,
                    'title' => 'legacy-title',
                    'message' => 'legacy-message',
                    'link' => null,
                    'status' => SystemNotification::STATUS_PENDING,
                    'metadata' => [],
                ]);
            }
        );

        $this->assertDatabaseHas('system_notifications', [
            'user_id' => $user->id,
            'event_key' => $eventKey,
            'title' => 'engine-title',
        ]);

        $this->assertDatabaseMissing('system_notifications', [
            'user_id' => $user->id,
            'event_key' => $eventKey,
            'title' => 'legacy-title',
        ]);

        $this->assertDatabaseMissing('system_notifications', [
            'user_id' => $otherUser->id,
            'event_key' => $eventKey,
            'title' => 'engine-title',
        ]);

        $this->assertDatabaseMissing('system_notifications', [
            'user_id' => $otherUser->id,
            'event_key' => $eventKey,
            'title' => 'legacy-title',
        ]);
    }

    #[Test]
    public function test_gate_enabled_engine_policy_disabled_blocks_task_due_soon_and_legacy(): void
    {
        config()->set('notifications.notification_engine.enabled', true);
        config()->set('notifications.notification_engine.pilot.enabled', true);
        config()->set('notifications.notification_engine.pilot.pilot_event_keys', ['task.due_soon']);
        config()->set('notifications.notification_engine.fallback_to_legacy_when_skipped', true);

        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        $taskId = 'task-uuid';
        $eventKey = 'task.due_soon';

        $setting = $this->createSettingWithAssignedUserRecipient($eventKey, isEnabled: false);

        NotificationRecipient::create([
            'notification_setting_id' => $setting->id,
            'recipient_type' => 'assigned_user',
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
            $eventKey,
            new NotificationEventContext([
                'title' => 'engine-title',
                'message' => 'engine-message',
                'link' => '/tasks/1',
                'metadata' => [
                    'task_id' => $taskId,
                ],
                'assigned_user_ids' => [$user->id],
            ]),
            legacyDispatch: function () use ($user, $eventKey, $taskId): void {
                SystemNotification::create([
                    'user_id' => $user->id,
                    'notifiable_type' => null,
                    'notifiable_id' => null,
                    'event_key' => $eventKey,
                    'title' => 'legacy-title',
                    'message' => 'legacy-message',
                    'link' => null,
                    'status' => SystemNotification::STATUS_PENDING,
                    'metadata' => [
                        'task_id' => $taskId,
                    ],
                ]);
            }
        );

        $this->assertSame(
            0,
            SystemNotification::query()
                ->where('user_id', $user->id)
                ->where('event_key', $eventKey)
                ->count()
        );

        $this->assertDatabaseMissing('system_notifications', [
            'user_id' => $otherUser->id,
            'event_key' => $eventKey,
            'title' => 'engine-title',
        ]);

        $this->assertDatabaseMissing('system_notifications', [
            'user_id' => $otherUser->id,
            'event_key' => $eventKey,
            'title' => 'legacy-title',
        ]);
    }

    #[Test]
    public function test_gate_enabled_engine_dispatches_task_overdue_and_skips_legacy(): void
    {
        config()->set('notifications.notification_engine.enabled', true);
        config()->set('notifications.notification_engine.pilot.enabled', true);
        config()->set('notifications.notification_engine.pilot.pilot_event_keys', ['task.overdue']);
        config()->set('notifications.notification_engine.fallback_to_legacy_when_skipped', false);

        $user = User::factory()->create();
        $taskId = 'task-uuid';

        $eventKey = 'task.overdue';
        $setting = $this->createSettingWithAssignedUserRecipient($eventKey);

        NotificationRecipient::create([
            'notification_setting_id' => $setting->id,
            'recipient_type' => 'assigned_user',
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
            $eventKey,
            new NotificationEventContext([
                'title' => 'engine-title',
                'message' => 'engine-message',
                'link' => '/tasks/1',
                'metadata' => [
                    'task_id' => $taskId,
                ],
                'assigned_user_ids' => [$user->id],
            ]),
            legacyDispatch: function () use ($user, $eventKey): void {
                SystemNotification::create([
                    'user_id' => $user->id,
                    'notifiable_type' => null,
                    'notifiable_id' => null,
                    'event_key' => $eventKey,
                    'title' => 'legacy-title',
                    'message' => 'legacy-message',
                    'link' => null,
                    'status' => SystemNotification::STATUS_PENDING,
                    'metadata' => [],
                ]);
            }
        );

        $this->assertDatabaseHas('system_notifications', [
            'user_id' => $user->id,
            'event_key' => $eventKey,
            'title' => 'engine-title',
        ]);

        $this->assertDatabaseMissing('system_notifications', [
            'user_id' => $user->id,
            'event_key' => $eventKey,
            'title' => 'legacy-title',
        ]);
    }

    #[Test]
    public function test_gate_enabled_engine_policy_missing_falls_back_to_legacy_for_task_due_soon(): void
    {
        config()->set('notifications.notification_engine.enabled', true);
        config()->set('notifications.notification_engine.pilot.enabled', true);
        config()->set('notifications.notification_engine.pilot.pilot_event_keys', ['task.due_soon']);
        config()->set('notifications.notification_engine.fallback_to_legacy_when_skipped', true);

        $user = User::factory()->create();
        $taskId = 'task-uuid';
        $eventKey = 'task.due_soon';

        $bridge = $this->makeBridge();

        $bridge->dispatchOrLegacy(
            $eventKey,
            new NotificationEventContext([
                'title' => 'engine-title',
                'message' => 'engine-message',
                'link' => '/tasks/1',
                'metadata' => [
                    'task_id' => $taskId,
                ],
                'assigned_user_ids' => [$user->id],
            ]),
            legacyDispatch: function () use ($user, $eventKey): void {
                SystemNotification::create([
                    'user_id' => $user->id,
                    'notifiable_type' => null,
                    'notifiable_id' => null,
                    'event_key' => $eventKey,
                    'title' => 'legacy-title',
                    'message' => 'legacy-message',
                    'link' => null,
                    'status' => SystemNotification::STATUS_PENDING,
                    'metadata' => [],
                ]);
            }
        );

        $this->assertDatabaseHas('system_notifications', [
            'user_id' => $user->id,
            'event_key' => $eventKey,
            'title' => 'legacy-title',
        ]);

        $this->assertDatabaseMissing('system_notifications', [
            'user_id' => $user->id,
            'event_key' => $eventKey,
            'title' => 'engine-title',
        ]);
    }

    #[Test]
    public function test_engine_task_due_soon_dedupe_uses_task_id_and_skips_duplicate_creation(): void
    {
        config()->set('notifications.notification_engine.enabled', true);
        config()->set('notifications.notification_engine.pilot.enabled', true);
        config()->set('notifications.notification_engine.pilot.pilot_event_keys', ['task.due_soon']);
        config()->set('notifications.notification_engine.fallback_to_legacy_when_skipped', false);

        $user = User::factory()->create();
        $taskId = 'task-uuid';
        $eventKey = 'task.due_soon';

        $setting = $this->createSettingWithAssignedUserRecipient($eventKey);

        NotificationRecipient::create([
            'notification_setting_id' => $setting->id,
            'recipient_type' => 'assigned_user',
            'role_name' => null,
            'user_id' => null,
            'recipient_value' => null,
            'resolver_config_json' => null,
            'channel_override' => null,
            'is_enabled' => true,
            'sort_order' => 0,
        ]);

        SystemNotification::create([
            'user_id' => $user->id,
            'notifiable_type' => null,
            'notifiable_id' => null,
            'event_key' => $eventKey,
            'title' => 'engine-title',
            'message' => 'engine-message',
            'link' => '/tasks/1',
            'status' => SystemNotification::STATUS_PENDING,
            'metadata' => [
                'task_id' => $taskId,
            ],
        ]);

        $bridge = $this->makeBridge();

        $bridge->dispatchOrLegacy(
            $eventKey,
            new NotificationEventContext([
                'title' => 'engine-title',
                'message' => 'engine-message',
                'link' => '/tasks/1',
                'metadata' => [
                    'task_id' => $taskId,
                ],
                'assigned_user_ids' => [$user->id],
            ]),
            legacyDispatch: function () use ($user, $eventKey): void {
                SystemNotification::create([
                    'user_id' => $user->id,
                    'notifiable_type' => null,
                    'notifiable_id' => null,
                    'event_key' => $eventKey,
                    'title' => 'legacy-title',
                    'message' => 'legacy-message',
                    'link' => null,
                    'status' => SystemNotification::STATUS_PENDING,
                    'metadata' => [],
                ]);
            }
        );

        $count = SystemNotification::query()
            ->where('user_id', $user->id)
            ->where('event_key', $eventKey)
            ->count();

        $this->assertSame(1, $count);
        $this->assertDatabaseMissing('system_notifications', [
            'user_id' => $user->id,
            'event_key' => $eventKey,
            'title' => 'legacy-title',
        ]);
    }
}

