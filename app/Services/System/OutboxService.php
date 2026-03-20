<?php

declare(strict_types=1);

namespace App\Services\System;

use App\Models\OutboxEvent;

final class OutboxService
{
    public function record(
        string $eventKey,
        string $aggregateType,
        string $aggregateId,
        array $payload
    ): OutboxEvent {
        return OutboxEvent::create([
            'event_key'      => $eventKey,
            'aggregate_type' => $aggregateType,
            'aggregate_id'   => $aggregateId,
            'payload'        => $payload,
            'status'         => OutboxEvent::STATUS_PENDING,
            'available_at'   => now(),
            'attempts'       => 0,
        ]);
    }

    public function markProcessing(OutboxEvent $event): void
    {
        $event->update([
            'status'  => OutboxEvent::STATUS_PROCESSING,
            'attempts' => $event->attempts + 1,
        ]);
    }

    public function markProcessed(OutboxEvent $event): void
    {
        $event->update([
            'status'       => OutboxEvent::STATUS_PROCESSED,
            'processed_at' => now(),
        ]);
    }

    public function markFailed(OutboxEvent $event): void
    {
        $event->update([
            'status' => OutboxEvent::STATUS_FAILED,
        ]);
    }
}
