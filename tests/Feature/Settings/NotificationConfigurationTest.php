<?php

declare(strict_types=1);

namespace Tests\Feature\Settings;

use App\Models\NotificationRecipient;
use App\Models\NotificationSetting;
use App\Models\User;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

final class NotificationConfigurationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware(ValidateCsrfToken::class);
    }

    private function makeAdmin(): User
    {
        Permission::findOrCreate('settings.manage');
        $role = Role::findOrCreate('admin');
        $role->givePermissionTo('settings.manage');

        /** @var User $user */
        $user = User::factory()->create();
        $user->assignRole('admin');

        return $user;
    }

    #[Test]
    public function authorized_admin_can_view_index_and_edit_page(): void
    {
        $admin = $this->makeAdmin();

        $setting = $this->createNotificationSetting([
            'event_key' => 'rfq.issued',
            'source_event_key' => null,
            'template_event_code' => null,
            'name' => 'RFQ Issued',
            'description' => null,
            'notes' => null,
            'module' => 'rfqs',
            'is_enabled' => true,
            'send_internal' => true,
            'send_email' => true,
            'send_broadcast' => false,
            'send_sms' => false,
            'send_whatsapp' => false,
            'delivery_mode' => 'immediate',
            'digest_frequency' => null,
            'environment_scope' => 'all',
            'conditions_json' => [],
        ]);

        $this->actingAs($admin)
            ->get(route('settings.notification-configuration.index'))
            ->assertOk();

        $this->actingAs($admin)
            ->get(route('settings.notification-configuration.edit', $setting->event_key))
            ->assertOk();
    }

    #[Test]
    public function unauthorized_user_cannot_access_notification_configuration(): void
    {
        /** @var User $user */
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('settings.notification-configuration.index'))
            ->assertForbidden();
    }

    #[Test]
    public function admin_can_update_setting_toggles_and_conditions_json(): void
    {
        $admin = $this->makeAdmin();

        $setting = $this->createNotificationSetting([
            'event_key' => 'rfq.issued',
            'source_event_key' => null,
            'template_event_code' => null,
            'name' => 'RFQ Issued',
            'description' => null,
            'notes' => null,
            'module' => 'rfqs',
            'is_enabled' => true,
            'send_internal' => true,
            'send_email' => true,
            'send_broadcast' => false,
            'send_sms' => false,
            'send_whatsapp' => false,
            'delivery_mode' => 'immediate',
            'digest_frequency' => null,
            'environment_scope' => 'all',
            'conditions_json' => [],
        ]);

        $this->actingAs($admin)->put(route('settings.notification-configuration.update', $setting->event_key), [
            'is_enabled' => false,
            'send_internal' => false,
            'send_email' => true,
            'send_sms' => false,
            'send_whatsapp' => false,
            'conditions_json' => json_encode(['mode' => 'all', 'rules' => []], JSON_THROW_ON_ERROR),
            'notes' => 'test',
        ])->assertRedirect();

        $setting->refresh();
        $this->assertFalse($setting->is_enabled);
        $this->assertFalse($setting->send_internal);
        $this->assertTrue($setting->send_email);
        $this->assertSame('test', $setting->notes);
        $this->assertIsArray($setting->conditions_json);

        // ActivityLogger skips writes while DB::transactionLevel() > 0; RefreshDatabase wraps
        // each test in a transaction, so activity_logs rows are not asserted here.
    }

    #[Test]
    public function admin_can_toggle_enabled_inline_without_changing_channels(): void
    {
        $admin = $this->makeAdmin();

        $setting = $this->createNotificationSetting([
            'event_key' => 'rfq.issued',
            'source_event_key' => null,
            'template_event_code' => null,
            'name' => 'RFQ Issued',
            'description' => null,
            'notes' => null,
            'module' => 'rfqs',
            'is_enabled' => true,
            'send_internal' => true,
            'send_email' => true,
            'send_broadcast' => false,
            'send_sms' => false,
            'send_whatsapp' => false,
            'delivery_mode' => 'immediate',
            'digest_frequency' => null,
            'environment_scope' => 'all',
            'conditions_json' => [],
        ]);

        $this->actingAs($admin)->patch(
            route('settings.notification-configuration.toggle-enabled', $setting->event_key),
            ['is_enabled' => false]
        )->assertRedirect();

        $setting->refresh();
        $this->assertFalse($setting->is_enabled);
        $this->assertTrue($setting->send_internal);
        $this->assertTrue($setting->send_email);
    }

    #[Test]
    public function invalid_conditions_json_is_rejected(): void
    {
        $admin = $this->makeAdmin();

        $setting = $this->createNotificationSetting([
            'event_key' => 'rfq.issued',
            'source_event_key' => null,
            'template_event_code' => null,
            'name' => 'RFQ Issued',
            'description' => null,
            'notes' => null,
            'module' => 'rfqs',
            'is_enabled' => true,
            'send_internal' => true,
            'send_email' => true,
            'send_broadcast' => false,
            'send_sms' => false,
            'send_whatsapp' => false,
            'delivery_mode' => 'immediate',
            'digest_frequency' => null,
            'environment_scope' => 'all',
            'conditions_json' => [],
        ]);

        $this->actingAs($admin)->from(route('settings.notification-configuration.edit', $setting->event_key))
            ->put(route('settings.notification-configuration.update', $setting->event_key), [
                'is_enabled' => true,
                'send_internal' => true,
                'send_email' => true,
                'send_sms' => false,
                'send_whatsapp' => false,
                'conditions_json' => '{not-json',
                'notes' => '',
            ])
            ->assertSessionHasErrors(['conditions_json']);
    }

    #[Test]
    public function recipient_rule_validation_works_for_explicit_email(): void
    {
        $admin = $this->makeAdmin();

        $setting = $this->createNotificationSetting([
            'event_key' => 'rfq.issued.supplier',
            'source_event_key' => null,
            'template_event_code' => null,
            'name' => 'RFQ Issued Supplier',
            'description' => null,
            'notes' => null,
            'module' => 'rfqs',
            'is_enabled' => true,
            'send_internal' => true,
            'send_email' => true,
            'send_broadcast' => false,
            'send_sms' => false,
            'send_whatsapp' => false,
            'delivery_mode' => 'immediate',
            'digest_frequency' => null,
            'environment_scope' => 'all',
            'conditions_json' => [],
        ]);

        $this->actingAs($admin)->from(route('settings.notification-configuration.edit', $setting->event_key))
            ->post(route('settings.notification-configuration.recipients.store', $setting->event_key), [
                'recipient_type' => 'explicit_email',
                'recipient_value' => 'not-an-email',
                'role_name' => '',
                'user_id' => null,
                'resolver_config_json' => '',
                'channel_override' => '',
                'is_enabled' => true,
                'sort_order' => 0,
            ])
            ->assertSessionHasErrors(['recipient_value']);
    }

    #[Test]
    public function admin_can_add_update_and_remove_recipient_rule(): void
    {
        $admin = $this->makeAdmin();

        $setting = $this->createNotificationSetting([
            'event_key' => 'rfq.issued.supplier',
            'source_event_key' => null,
            'template_event_code' => null,
            'name' => 'RFQ Issued Supplier',
            'description' => null,
            'notes' => null,
            'module' => 'rfqs',
            'is_enabled' => true,
            'send_internal' => true,
            'send_email' => true,
            'send_broadcast' => false,
            'send_sms' => false,
            'send_whatsapp' => false,
            'delivery_mode' => 'immediate',
            'digest_frequency' => null,
            'environment_scope' => 'all',
            'conditions_json' => [],
        ]);

        $this->actingAs($admin)
            ->post(route('settings.notification-configuration.recipients.store', $setting->event_key), [
                'recipient_type' => 'explicit_email',
                'recipient_value' => 'test@example.com',
                'role_name' => '',
                'user_id' => null,
                'resolver_config_json' => '',
                'channel_override' => 'email',
                'is_enabled' => true,
                'sort_order' => 0,
            ])
            ->assertRedirect();

        $recipient = NotificationRecipient::query()->where('notification_setting_id', $setting->id)->firstOrFail();

        $this->actingAs($admin)
            ->put(route('settings.notification-configuration.recipients.update', [$setting->event_key, $recipient->id]), [
                'recipient_type' => 'explicit_email',
                'recipient_value' => 'test2@example.com',
                'role_name' => '',
                'user_id' => null,
                'resolver_config_json' => '',
                'channel_override' => 'email',
                'is_enabled' => false,
                'sort_order' => 10,
            ])
            ->assertRedirect();

        $recipient->refresh();
        $this->assertSame('test2@example.com', $recipient->recipient_value);
        $this->assertFalse($recipient->is_enabled);
        $this->assertSame(10, $recipient->sort_order);

        $this->actingAs($admin)
            ->delete(route('settings.notification-configuration.recipients.destroy', [$setting->event_key, $recipient->id]))
            ->assertRedirect();

        $this->assertDatabaseMissing('notification_recipients', [
            'id' => $recipient->id,
        ]);
    }

    #[Test]
    public function admin_can_add_user_recipient_rule(): void
    {
        $admin = $this->makeAdmin();
        $user = User::factory()->create();

        $setting = $this->createNotificationSetting([
            'event_key' => 'rfq.issued.supplier',
            'source_event_key' => null,
            'template_event_code' => null,
            'name' => 'RFQ Issued Supplier',
            'description' => null,
            'notes' => null,
            'module' => 'rfqs',
            'is_enabled' => true,
            'send_internal' => true,
            'send_email' => true,
            'send_broadcast' => false,
            'send_sms' => false,
            'send_whatsapp' => false,
            'delivery_mode' => 'immediate',
            'digest_frequency' => null,
            'environment_scope' => 'all',
            'conditions_json' => [],
        ]);

        $this->actingAs($admin)->from(route('settings.notification-configuration.edit', $setting->event_key))
            ->post(route('settings.notification-configuration.recipients.store', $setting->event_key), [
                'recipient_type' => 'user',
                'recipient_value' => null,
                'role_name' => '',
                'user_id' => $user->id,
                'resolver_config_json' => '',
                'channel_override' => '',
                'is_enabled' => true,
                'sort_order' => 0,
            ])->assertRedirect();

        $recipient = NotificationRecipient::query()
            ->where('notification_setting_id', $setting->id)
            ->where('recipient_type', 'user')
            ->firstOrFail();

        $this->assertSame($user->id, $recipient->user_id);
    }
}

