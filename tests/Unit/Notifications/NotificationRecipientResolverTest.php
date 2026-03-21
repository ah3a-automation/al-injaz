<?php

declare(strict_types=1);

namespace Tests\Unit\Notifications;

use App\Models\NotificationRecipient;
use App\Models\NotificationSetting;
use App\Models\User;
use App\Services\Notifications\NotificationEventContext;
use App\Services\Notifications\NotificationRecipientResolver;
use App\Services\Notifications\ResolvedNotificationPolicyData;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

final class NotificationRecipientResolverTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function test_resolves_creator_recipient_from_created_by_user_id(): void
    {
        $user = User::factory()->create();

        $setting = $this->createNotificationSetting([
            'event_key' => 'unit.test.creator',
            'name' => 'Test',
            'description' => null,
            'notes' => null,
            'module' => 'rfqs',
            'is_enabled' => true,
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

        $this->createNotificationRecipient([
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

        $resolver = new NotificationRecipientResolver();
        $policy = new ResolvedNotificationPolicyData(
            emittedEventKey: 'unit.test.creator',
            effectiveEventKey: 'unit.test.creator',
            canonicalEventKey: 'unit.test.creator',
            notificationSettingId: (string) $setting->id,
            module: 'rfqs',
            isEnabled: true,
            sendInternal: true,
            sendEmail: false,
            sendSms: false,
            sendWhatsapp: false,
            deliveryMode: 'immediate',
            digestFrequency: null,
            environmentScope: 'all',
            conditionsJson: [],
            templateEventCode: null,
            sourceEventKey: null,
            metadata: []
        );

        $context = new NotificationEventContext([
            'created_by_user_id' => $user->id,
        ]);

        $resolved = $resolver->resolve($policy, $context);

        $this->assertCount(1, $resolved);
        $this->assertSame($user->id, $resolved[0]->userId);
    }

    #[Test]
    public function test_resolves_approver_recipient_from_permission_name(): void
    {
        $permission = Permission::findOrCreate('suppliers.approve');

        $role = Role::findOrCreate('procurement');
        $role->givePermissionTo($permission->name);

        $user = User::factory()->create();
        $user->assignRole($role->name);

        $setting = $this->createNotificationSetting([
            'event_key' => 'unit.test.approver',
            'name' => 'Test',
            'description' => null,
            'notes' => null,
            'module' => 'suppliers',
            'is_enabled' => true,
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

        $this->createNotificationRecipient([
            'notification_setting_id' => $setting->id,
            'recipient_type' => 'approver',
            'role_name' => $permission->name,
            'user_id' => null,
            'recipient_value' => null,
            'resolver_config_json' => null,
            'channel_override' => null,
            'is_enabled' => true,
            'sort_order' => 0,
        ]);

        $resolver = new NotificationRecipientResolver();
        $policy = new ResolvedNotificationPolicyData(
            emittedEventKey: 'unit.test.approver',
            effectiveEventKey: 'unit.test.approver',
            canonicalEventKey: 'unit.test.approver',
            notificationSettingId: (string) $setting->id,
            module: 'suppliers',
            isEnabled: true,
            sendInternal: true,
            sendEmail: false,
            sendSms: false,
            sendWhatsapp: false,
            deliveryMode: 'immediate',
            digestFrequency: null,
            environmentScope: 'all',
            conditionsJson: [],
            templateEventCode: null,
            sourceEventKey: null,
            metadata: []
        );

        $context = new NotificationEventContext([]);
        $resolved = $resolver->resolve($policy, $context);

        $this->assertNotEmpty($resolved);
        $this->assertSame($user->id, $resolved[0]->userId);
    }

    #[Test]
    public function test_resolves_assigned_user_recipient_from_assigned_user_ids_context(): void
    {
        $user = User::factory()->create();

        $setting = $this->createNotificationSetting([
            'event_key' => 'unit.test.assigned_user',
            'name' => 'Test',
            'description' => null,
            'notes' => null,
            'module' => 'tasks',
            'is_enabled' => true,
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

        $this->createNotificationRecipient([
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

        $resolver = new NotificationRecipientResolver();
        $policy = new ResolvedNotificationPolicyData(
            emittedEventKey: 'unit.test.assigned_user',
            effectiveEventKey: 'unit.test.assigned_user',
            canonicalEventKey: 'unit.test.assigned_user',
            notificationSettingId: (string) $setting->id,
            module: 'tasks',
            isEnabled: true,
            sendInternal: true,
            sendEmail: false,
            sendSms: false,
            sendWhatsapp: false,
            deliveryMode: 'immediate',
            digestFrequency: null,
            environmentScope: 'all',
            conditionsJson: [],
            templateEventCode: null,
            sourceEventKey: null,
            metadata: []
        );

        $context = new NotificationEventContext([
            'assigned_user_ids' => [$user->id],
        ]);

        $resolved = $resolver->resolve($policy, $context);

        $this->assertCount(1, $resolved);
        $this->assertSame($user->id, $resolved[0]->userId);
    }
}

