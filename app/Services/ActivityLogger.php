<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Log\LogManager;
use Illuminate\Support\Facades\DB;

class ActivityLogger
{
    public function __construct(
        private readonly LogManager $logger
    ) {}

    /**
     * Log a state-changing event AFTER database transaction commit.
     * Never call this method inside an open transaction.
     * Event format: {module}.{entity}.{action} (e.g. projects.project.created)
     */
    public function log(
        string $event,
        Model $subject,
        array $oldValues = [],
        array $newValues = [],
        ?User $causer = null,
        ?array $context = null
    ): void {
        if (DB::transactionLevel() > 0) {
            $this->logger->warning('ActivityLogger skipped — called inside transaction', [
                'event' => $event,
            ]);
            return;
        }

        try {
            $ip = app()->runningInConsole() ? null : request()->ip();
            $ua = app()->runningInConsole() ? null : request()->userAgent();

            ActivityLog::create([
                'event'          => $event,
                'subject_type'   => $subject::class,
                'subject_id'     => (string) $subject->getKey(),
                'causer_user_id' => $causer?->id,
                'old_values'     => empty($oldValues) ? null : $oldValues,
                'new_values'     => empty($newValues) ? null : $newValues,
                'context'        => $context,
                'ip_address'     => $ip,
                'user_agent'     => $ua,
            ]);
        } catch (\Throwable $e) {
            $this->logger->error('ActivityLogger failed', [
                'event' => $event,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
