<?php

declare(strict_types=1);

namespace Tests\Feature\Outbox;

use App\Models\OutboxEvent;
use App\Services\System\OutboxService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

final class OutboxEventIntegrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_outbox_service_records_event(): void
    {
        $aggregateId = (string) Str::uuid();
        $outbox = app(OutboxService::class)->record(
            'test.event',
            'test_aggregate',
            $aggregateId,
            ['key' => 'value']
        );

        $this->assertInstanceOf(OutboxEvent::class, $outbox);
        $this->assertSame('test.event', $outbox->event_key);
        $this->assertSame('test_aggregate', $outbox->aggregate_type);
        $this->assertSame($aggregateId, $outbox->aggregate_id);
        $this->assertSame(['key' => 'value'], $outbox->payload);
        $this->assertSame(OutboxEvent::STATUS_PENDING, $outbox->status);
        $this->assertSame(0, $outbox->attempts);

        $this->assertDatabaseHas('outbox_events', [
            'event_key'      => 'test.event',
            'aggregate_type' => 'test_aggregate',
            'aggregate_id'   => $aggregateId,
            'status'         => OutboxEvent::STATUS_PENDING,
        ]);
    }

    public function test_outbox_process_command_processes_pending_events(): void
    {
        app(OutboxService::class)->record('test.process', 'test', (string) Str::uuid(), []);

        $this->artisan('outbox:process', ['--limit' => 10])
            ->assertSuccessful();

        $this->assertDatabaseHas('outbox_events', [
            'event_key' => 'test.process',
            'status'    => OutboxEvent::STATUS_PROCESSED,
        ]);
    }
}
