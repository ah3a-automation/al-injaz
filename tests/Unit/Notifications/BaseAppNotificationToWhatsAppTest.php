<?php

declare(strict_types=1);

namespace Tests\Unit\Notifications;

use App\Models\User;
use App\Notifications\BaseAppNotification;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

final class BaseAppNotificationToWhatsAppTest extends TestCase
{
    use RefreshDatabase;

    public function test_to_whatsapp_renders_variables_and_plain_text(): void
    {
        DB::table('notification_templates')->insert([
            'event_code' => 'unit.test.whatsapp',
            'name' => 'Hello {{name}}',
            'subject' => 'S',
            'body_text' => 'Body line {{name}}',
            'whatsapp_body' => 'WA {{name}}',
            'body_html' => null,
            'type' => 'info',
            'email_enabled' => true,
            'inapp_enabled' => true,
            'whatsapp_enabled' => false,
            'sms_enabled' => false,
            'allow_self_notify' => false,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $notification = new class extends BaseAppNotification
        {
            public function getEventCode(): string
            {
                return 'unit.test.whatsapp';
            }

            protected function getVariables(): array
            {
                return ['name' => 'Ada'];
            }

            protected function getLink(): ?string
            {
                return '/tasks/1';
            }

            public function getNotifiable(): ?Model
            {
                return null;
            }
        };

        $text = $notification->toWhatsApp(User::factory()->make());
        $this->assertStringContainsString('*Hello Ada*', $text);
        $this->assertStringContainsString('WA Ada', $text);
        $this->assertStringContainsString(url('/tasks/1'), $text);
    }
}
