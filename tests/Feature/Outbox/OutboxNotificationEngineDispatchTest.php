<?php

declare(strict_types=1);

namespace Tests\Feature\Outbox;

use App\Models\NotificationRecipient;
use App\Models\NotificationSetting;
use App\Models\OutboxEvent;
use App\Models\SystemNotification;
use App\Models\User;
use App\Services\Notifications\NotificationOutboxEventKeyMapper;
use App\Services\System\OutboxService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class OutboxNotificationEngineDispatchTest extends TestCase
{
    use RefreshDatabase;

    private function createCreatorSetting(string $eventKey, bool $isEnabled = true): NotificationSetting
    {
        $setting = $this->createNotificationSetting([
            'event_key' => $eventKey,
            'name' => 'Test',
            'description' => null,
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
            'conditions_json' => [],
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

        return $setting;
    }

    private function createSupplierUserSetting(string $eventKey, bool $isEnabled = true): NotificationSetting
    {
        $setting = $this->createNotificationSetting([
            'event_key' => $eventKey,
            'name' => 'Test',
            'description' => null,
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
            'conditions_json' => [],
        ]);

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

        return $setting;
    }

    #[Test]
    public function outbox_allowed_event_dispatches_rfQ_evaluation_via_engine(): void
    {
        config()->set('notifications.notification_engine.outbox_dispatch.enabled', true);
        config()->set('notifications.notification_engine.outbox_dispatch.allowed_event_keys', ['rfq.evaluation']);

        $creator = User::factory()->create();
        $rfqId = (string) Str::uuid();

        $this->createCreatorSetting('rfq.evaluation');

        app(OutboxService::class)->record(
            'rfq.evaluation',
            'rfq',
            $rfqId,
            [
                'title' => 'engine-title',
                'message' => 'engine-message',
                'link' => '/rfqs/' . $rfqId,
                'metadata' => ['rfq_id' => $rfqId],
                'created_by_user_id' => $creator->id,
                'actor_id' => $creator->id,
                NotificationOutboxEventKeyMapper::META_NOTIFICATION_EVENT_KEY => 'rfq.evaluation',
            ]
        );

        $this->artisan('outbox:process', ['--limit' => 10])
            ->assertSuccessful();

        $this->assertDatabaseHas('system_notifications', [
            'user_id' => $creator->id,
            'event_key' => 'rfq.evaluation',
            'title' => 'engine-title',
            'message' => 'engine-message',
            'link' => '/rfqs/' . $rfqId,
        ]);
    }

    #[Test]
    public function outbox_non_allowed_event_is_skipped(): void
    {
        config()->set('notifications.notification_engine.outbox_dispatch.enabled', true);
        config()->set('notifications.notification_engine.outbox_dispatch.allowed_event_keys', ['rfq.clarification_public']);

        $creator = User::factory()->create();
        $rfqId = (string) Str::uuid();

        $this->createCreatorSetting('rfq.evaluation');

        app(OutboxService::class)->record(
            'rfq.evaluation',
            'rfq',
            $rfqId,
            [
                'title' => 'engine-title',
                'message' => 'engine-message',
                'link' => '/rfqs/' . $rfqId,
                'metadata' => ['rfq_id' => $rfqId],
                'created_by_user_id' => $creator->id,
                'actor_id' => $creator->id,
                NotificationOutboxEventKeyMapper::META_NOTIFICATION_EVENT_KEY => 'rfq.evaluation',
            ]
        );

        $this->artisan('outbox:process', ['--limit' => 10])
            ->assertSuccessful();

        $this->assertDatabaseCount('system_notifications', 0);
    }

    #[Test]
    public function outbox_quote_submitted_vs_revised_mapping_works(): void
    {
        config()->set('notifications.notification_engine.outbox_dispatch.enabled', true);
        config()->set('notifications.notification_engine.outbox_dispatch.allowed_event_keys', ['rfq.quote_submitted']);

        $creator = User::factory()->create();
        $rfqId = (string) Str::uuid();
        $supplierId = (string) Str::uuid();

        $this->createCreatorSetting('quote.submitted');
        $this->createCreatorSetting('quote.revised');

        // quote.submitted
        app(OutboxService::class)->record(
            'rfq.quote_submitted',
            'rfq_supplier_quote',
            (string) Str::uuid(),
            [
                'title' => 'submitted-title',
                'message' => 'submitted-message',
                'link' => '/rfqs/' . $rfqId,
                'metadata' => ['rfq_id' => $rfqId, 'supplier_id' => $supplierId],
                'created_by_user_id' => $creator->id,
                'actor_id' => $creator->id,
                'quote_event_key' => 'quote.submitted',
            ]
        );

        // quote.revised
        app(OutboxService::class)->record(
            'rfq.quote_submitted',
            'rfq_supplier_quote',
            (string) Str::uuid(),
            [
                'title' => 'revised-title',
                'message' => 'revised-message',
                'link' => '/rfqs/' . $rfqId,
                'metadata' => ['rfq_id' => $rfqId, 'supplier_id' => $supplierId],
                'created_by_user_id' => $creator->id,
                'actor_id' => $creator->id,
                'quote_event_key' => 'quote.revised',
            ]
        );

        $this->artisan('outbox:process', ['--limit' => 10])
            ->assertSuccessful();

        $this->assertDatabaseHas('system_notifications', [
            'user_id' => $creator->id,
            'event_key' => 'quote.submitted',
            'title' => 'submitted-title',
            'message' => 'submitted-message',
        ]);

        $this->assertDatabaseHas('system_notifications', [
            'user_id' => $creator->id,
            'event_key' => 'quote.revised',
            'title' => 'revised-title',
            'message' => 'revised-message',
        ]);
    }

    #[Test]
    public function outbox_dispatch_does_not_duplicate_existing_system_notification(): void
    {
        config()->set('notifications.notification_engine.outbox_dispatch.enabled', true);
        config()->set('notifications.notification_engine.outbox_dispatch.allowed_event_keys', ['rfq.evaluation']);

        $creator = User::factory()->create();
        $rfqId = (string) Str::uuid();

        $this->createCreatorSetting('rfq.evaluation');

        // Simulate legacy already creating the notification.
        SystemNotification::create([
            'user_id' => $creator->id,
            'notifiable_type' => null,
            'notifiable_id' => null,
            'event_key' => 'rfq.evaluation',
            'title' => 'legacy-title',
            'message' => 'legacy-message',
            'link' => '/rfqs/' . $rfqId,
            'status' => SystemNotification::STATUS_PENDING,
            'metadata' => ['rfq_id' => $rfqId],
        ]);

        app(OutboxService::class)->record(
            'rfq.evaluation',
            'rfq',
            $rfqId,
            [
                'title' => 'engine-title',
                'message' => 'engine-message',
                'link' => '/rfqs/' . $rfqId,
                'metadata' => ['rfq_id' => $rfqId],
                'created_by_user_id' => $creator->id,
                'actor_id' => $creator->id,
                NotificationOutboxEventKeyMapper::META_NOTIFICATION_EVENT_KEY => 'rfq.evaluation',
            ]
        );

        $this->artisan('outbox:process', ['--limit' => 10])
            ->assertSuccessful();

        $this->assertSame(1, SystemNotification::query()
            ->where('user_id', $creator->id)
            ->where('event_key', 'rfq.evaluation')
            ->count());
    }

    #[Test]
    public function outbox_allowed_event_dispatches_clarification_made_public_for_supplier_user(): void
    {
        config()->set('notifications.notification_engine.outbox_dispatch.enabled', true);
        config()->set('notifications.notification_engine.outbox_dispatch.allowed_event_keys', ['rfq.clarification_public']);

        $supplierUser = User::factory()->create();
        $rfqId = (string) Str::uuid();
        $clarificationId = (string) Str::uuid();

        $this->createSupplierUserSetting('clarification.made_public');

        // Payload intentionally omits notification_event_key to ensure mapping
        // uses the outbox key + centralized mapper fallback.
        app(OutboxService::class)->record(
            'rfq.clarification_public',
            'rfq_clarification',
            $clarificationId,
            [
                'title' => 'clarification-title',
                'message' => 'clarification-message',
                'link' => '/supplier/rfqs/' . $rfqId,
                'metadata' => [
                    'rfq_id' => $rfqId,
                    'clarification_id' => $clarificationId,
                ],
                'supplier_user_ids' => [$supplierUser->id],
            ]
        );

        $this->artisan('outbox:process', ['--limit' => 10])
            ->assertSuccessful();

        $this->assertDatabaseHas('system_notifications', [
            'user_id' => $supplierUser->id,
            'event_key' => 'clarification.made_public',
            'title' => 'clarification-title',
            'message' => 'clarification-message',
        ]);
    }
}

