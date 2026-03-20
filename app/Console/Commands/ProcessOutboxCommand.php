<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\OutboxEvent;
use App\Services\System\OutboxService;
use App\Services\Notifications\NotificationDispatcher;
use App\Services\Notifications\NotificationEventContext;
use App\Services\Notifications\NotificationOutboxEventKeyMapper;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

final class ProcessOutboxCommand extends Command
{
    protected $signature = 'outbox:process
                            {--limit=50 : Max events to process per run}
                            {--max-attempts=5 : Mark failed after this many attempts}';

    protected $description = 'Process pending outbox events (transactional outbox pattern)';

    public function __construct(
        private readonly OutboxService $outboxService,
        private readonly NotificationDispatcher $notificationDispatcher,
        private readonly NotificationOutboxEventKeyMapper $outboxEventKeyMapper,
    ) {
        parent::__construct();
    }

    public function handle(): int
    {
        $limit = (int) $this->option('limit');
        $maxAttempts = (int) $this->option('max-attempts');

        $events = OutboxEvent::query()
            ->where('status', OutboxEvent::STATUS_PENDING)
            ->where('available_at', '<=', now())
            ->orderBy('available_at')
            ->limit($limit)
            ->get();

        if ($events->isEmpty()) {
            $this->info('No pending outbox events.');
            return self::SUCCESS;
        }

        $processed = 0;
        $failed = 0;

        foreach ($events as $event) {
            try {
                $this->outboxService->markProcessing($event);

                $this->processEvent($event);

                $this->outboxService->markProcessed($event);
                $processed++;
                $this->line("Processed: {$event->event_key} [{$event->id}]");
            } catch (\Throwable $e) {
                Log::warning('Outbox event processing failed', [
                    'event_id'   => $event->id,
                    'event_key'  => $event->event_key,
                    'attempts'   => $event->attempts,
                    'exception'  => $e->getMessage(),
                ]);
                $this->warn("Failed: {$event->event_key} [{$event->id}] - {$e->getMessage()}");

                $event->refresh();
                if ($event->attempts >= $maxAttempts) {
                    $this->outboxService->markFailed($event);
                    $failed++;
                } else {
                    $event->update(['status' => OutboxEvent::STATUS_PENDING]);
                }
            }
        }

        $this->info("Processed: {$processed}, Failed (max attempts): {$failed}");
        return self::SUCCESS;
    }

    private function processEvent(OutboxEvent $event): void
    {
        $payload = is_array($event->payload) ? $event->payload : [];

        $dispatchEnabled = (bool) config('notifications.notification_engine.outbox_dispatch.enabled', false);
        if (! $dispatchEnabled) {
            // External integrations (WhatsApp, email) to be added later.
            Log::info('Outbox event processed (no dispatch)', [
                'event_key'      => $event->event_key,
                'aggregate_type' => $event->aggregate_type,
                'aggregate_id'   => $event->aggregate_id,
                'payload'        => $payload,
            ]);

            return;
        }

        $allowedKeys = config('notifications.notification_engine.outbox_dispatch.allowed_event_keys', []);
        if (! is_array($allowedKeys) || ! in_array($event->event_key, $allowedKeys, true)) {
            Log::info('Outbox dispatch skipped (not in allow-list)', [
                'event_key' => $event->event_key,
                'outbox_id' => $event->id,
            ]);

            return;
        }

        $notificationEventKey = $this->outboxEventKeyMapper->mapOutboxEvent($event);
        if ($notificationEventKey === null) {
            Log::info('Outbox dispatch skipped (no mapping)', [
                'event_key' => $event->event_key,
                'outbox_id' => $event->id,
            ]);

            return;
        }

        Log::info('Outbox dispatch mapping resolved', [
            'outbox_event_key' => $event->event_key,
            'notification_event_key' => $notificationEventKey,
            'outbox_id' => $event->id,
        ]);

        $context = new NotificationEventContext($payload);
        $result = $this->notificationDispatcher->dispatch($notificationEventKey, $context);

        if ($result->dispatched) {
            Log::info('Outbox dispatch completed', [
                'notification_event_key' => $notificationEventKey,
                'outbox_id' => $event->id,
                'channels' => $result->executedChannels,
            ]);
        } else {
            Log::info('Outbox dispatch skipped', [
                'notification_event_key' => $notificationEventKey,
                'outbox_id' => $event->id,
                'status' => $result->status,
                'reason' => $result->skippedReason,
            ]);
        }
    }
}
