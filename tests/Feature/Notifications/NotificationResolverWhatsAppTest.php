<?php

declare(strict_types=1);

namespace Tests\Feature\Notifications;

use App\Models\User;
use App\Notifications\NotificationResolver;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

final class NotificationResolverWhatsAppTest extends TestCase
{
    use RefreshDatabase;

    public function test_whatsapp_omitted_when_evolution_not_configured(): void
    {
        config([
            'services.evolution.url' => '',
            'services.evolution.key' => '',
            'services.evolution.instance' => '',
        ]);

        DB::table('notification_templates')->insert([
            'event_code' => 'supplier.approved',
            'name' => 'Supplier Approved',
            'subject' => 'S',
            'body_text' => 'Body',
            'whatsapp_body' => null,
            'body_html' => null,
            'type' => 'success',
            'email_enabled' => true,
            'inapp_enabled' => true,
            'whatsapp_enabled' => true,
            'sms_enabled' => false,
            'allow_self_notify' => false,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $user = User::factory()->create();
        $resolver = new NotificationResolver;
        $plan = $resolver->resolve('supplier.approved', $user, null, null);

        $recipient = $plan->recipients->first();
        $this->assertNotNull($recipient);
        $this->assertNotContains('whatsapp', $recipient->channels);
    }

    public function test_whatsapp_included_when_evolution_configured(): void
    {
        config([
            'services.evolution.url' => 'http://evolution.test',
            'services.evolution.key' => 'k',
            'services.evolution.instance' => 'i',
        ]);

        DB::table('notification_templates')->insert([
            'event_code' => 'supplier.approved',
            'name' => 'Supplier Approved',
            'subject' => 'S',
            'body_text' => 'Body',
            'whatsapp_body' => null,
            'body_html' => null,
            'type' => 'success',
            'email_enabled' => false,
            'inapp_enabled' => false,
            'whatsapp_enabled' => true,
            'sms_enabled' => false,
            'allow_self_notify' => false,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $user = User::factory()->create();
        $resolver = new NotificationResolver;
        $plan = $resolver->resolve('supplier.approved', $user, null, null);

        $recipient = $plan->recipients->first();
        $this->assertNotNull($recipient);
        $this->assertContains('whatsapp', $recipient->channels);
    }
}
