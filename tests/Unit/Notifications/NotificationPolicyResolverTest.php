<?php

declare(strict_types=1);

namespace Tests\Unit\Notifications;

use App\Models\NotificationSetting;
use App\Services\Notifications\NotificationEventContext;
use App\Services\Notifications\NotificationPolicyResolver;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class NotificationPolicyResolverTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function test_falls_back_to_canonical_event_key_when_alias_setting_missing(): void
    {
        $this->createNotificationSetting([
            'event_key' => 'supplier.document_expiring_soon',
            'source_event_key' => null,
            'template_event_code' => null,
            'name' => 'Supplier Document Expiring Soon',
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
        ]);

        $resolver = new NotificationPolicyResolver();
        $context = new NotificationEventContext([]);

        $policy = $resolver->resolve('supplier.document_expiring_soon.internal', $context);

        $this->assertNotNull($policy);
        $this->assertSame('supplier.document_expiring_soon', $policy->effectiveEventKey);
        $this->assertSame('supplier.document_expiring_soon', $policy->canonicalEventKey);
        $this->assertTrue($policy->isEnabled);
    }

    #[Test]
    public function test_returns_null_when_setting_missing(): void
    {
        $resolver = new NotificationPolicyResolver();
        $context = new NotificationEventContext([]);

        $policy = $resolver->resolve('missing.event.key', $context);

        $this->assertNull($policy);
    }
}

