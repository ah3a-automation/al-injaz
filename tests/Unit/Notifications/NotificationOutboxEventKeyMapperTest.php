<?php

declare(strict_types=1);

namespace Tests\Unit\Notifications;

use App\Services\Notifications\NotificationOutboxEventKeyMapper;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class NotificationOutboxEventKeyMapperTest extends TestCase
{
    private function make(): NotificationOutboxEventKeyMapper
    {
        return new NotificationOutboxEventKeyMapper();
    }

    #[Test]
    public function test_maps_payload_notification_event_key_when_present(): void
    {
        $mapper = $this->make();

        $mapped = $mapper->mapOutboxEventKey('anything', [
            NotificationOutboxEventKeyMapper::META_NOTIFICATION_EVENT_KEY => 'some.policy.key',
        ]);

        $this->assertSame('some.policy.key', $mapped);
    }

    #[Test]
    public function test_maps_rfq_quote_submitted_via_quote_event_key_payload(): void
    {
        $mapper = $this->make();

        $mapped = $mapper->mapOutboxEventKey(
            'rfq.quote_submitted',
            [
                NotificationOutboxEventKeyMapper::META_QUOTE_EVENT_KEY => 'quote.revised',
            ]
        );

        $this->assertSame('quote.revised', $mapped);
    }

    #[Test]
    public function test_maps_rfq_clarification_public_without_payload_override(): void
    {
        $mapper = $this->make();

        $mapped = $mapper->mapOutboxEventKey('rfq.clarification_public', []);

        $this->assertSame('clarification.made_public', $mapped);
    }

    #[Test]
    public function test_maps_rfq_evaluation_without_payload_override(): void
    {
        $mapper = $this->make();

        $mapped = $mapper->mapOutboxEventKey('rfq.evaluation', []);

        $this->assertSame('rfq.evaluation', $mapped);
    }
}

