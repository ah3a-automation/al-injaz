<?php

declare(strict_types=1);

namespace Tests\Feature\Settings;

use App\Models\SystemSetting;
use App\Models\User;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

final class NotificationSettingsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware(ValidateCsrfToken::class);
    }

    #[Test]
    public function authorized_admin_can_update_task_due_soon_warning_days(): void
    {
        $permission = Permission::findOrCreate('settings.manage');
        $role = Role::findOrCreate('admin');
        $role->givePermissionTo($permission->name);

        $admin = User::factory()->create();
        $admin->assignRole($role->name);

        $this->actingAs($admin)->post(route('settings.notifications.update'), [
            'supplier_document_expiry_warning_days' => 30,
            'supplier_document_expiry_notify_inapp' => true,
            'supplier_document_expiry_notify_email' => false,
            'task_due_soon_warning_days' => 9,
            'task_overdue_reminders_enabled' => true,
        ])->assertRedirect(route('settings.notifications.index'));

        $this->assertSame(9, (int) SystemSetting::get('task_due_soon_warning_days'));
        $this->assertSame('1', (string) SystemSetting::get('task_overdue_reminders_enabled'));
    }

    #[Test]
    public function unauthorized_user_cannot_update_notification_settings(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->post(route('settings.notifications.update'), [
            'supplier_document_expiry_warning_days' => 30,
            'supplier_document_expiry_notify_inapp' => true,
            'supplier_document_expiry_notify_email' => false,
            'task_due_soon_warning_days' => 9,
            'task_overdue_reminders_enabled' => true,
        ])->assertForbidden();
    }

    #[Test]
    public function task_due_soon_warning_days_must_be_within_bounds(): void
    {
        $permission = Permission::findOrCreate('settings.manage');
        $role = Role::findOrCreate('admin');
        $role->givePermissionTo($permission->name);

        $admin = User::factory()->create();
        $admin->assignRole($role->name);

        $this->actingAs($admin)->post(route('settings.notifications.update'), [
            'supplier_document_expiry_warning_days' => 30,
            'supplier_document_expiry_notify_inapp' => true,
            'supplier_document_expiry_notify_email' => false,
            'task_due_soon_warning_days' => 0,
            'task_overdue_reminders_enabled' => true,
        ])->assertSessionHasErrors(['task_due_soon_warning_days']);

        $this->actingAs($admin)->post(route('settings.notifications.update'), [
            'supplier_document_expiry_warning_days' => 30,
            'supplier_document_expiry_notify_inapp' => true,
            'supplier_document_expiry_notify_email' => false,
            'task_due_soon_warning_days' => 366,
            'task_overdue_reminders_enabled' => true,
        ])->assertSessionHasErrors(['task_due_soon_warning_days']);

        $this->actingAs($admin)->post(route('settings.notifications.update'), [
            'supplier_document_expiry_warning_days' => 30,
            'supplier_document_expiry_notify_inapp' => true,
            'supplier_document_expiry_notify_email' => false,
            'task_due_soon_warning_days' => 10,
            'task_overdue_reminders_enabled' => 'not-a-boolean',
        ])->assertSessionHasErrors(['task_overdue_reminders_enabled']);
    }

    #[Test]
    public function settings_page_displays_effective_task_reminder_settings(): void
    {
        $permission = Permission::findOrCreate('settings.manage');
        $role = Role::findOrCreate('admin');
        $role->givePermissionTo($permission->name);

        $admin = User::factory()->create();
        $admin->assignRole($role->name);

        SystemSetting::set('task_due_soon_warning_days', 11);
        SystemSetting::set('task_overdue_reminders_enabled', '0');

        $response = $this->actingAs($admin)->get(route('settings.notifications.index'))->assertOk();
        $content = (string) $response->getContent();

        // Inertia payload is JSON in the test harness; fall back to string checks.
        $decoded = json_decode($content, true);
        if (is_array($decoded)) {
            $pageProps = $decoded['props']['page']['props']
                ?? $decoded['props']['page']
                ?? $decoded['props']
                ?? $decoded;

            if (is_array($pageProps)) {
                $this->assertArrayHasKey('task_due_soon_effective_warning_days', $pageProps);
                $this->assertArrayHasKey('task_overdue_effective_reminders_enabled', $pageProps);
                $this->assertSame(11, (int) ($pageProps['task_due_soon_effective_warning_days'] ?? 0));
            } else {
                $this->assertStringContainsString('task_due_soon_effective_warning_days', $content);
            }
        } else {
            $this->assertStringContainsString('task_due_soon_effective_warning_days', $content);
            $this->assertStringContainsString('task_overdue_effective_reminders_enabled', $content);
        }
    }
}

