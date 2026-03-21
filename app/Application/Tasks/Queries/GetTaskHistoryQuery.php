<?php

declare(strict_types=1);

namespace App\Application\Tasks\Queries;

use App\Models\ActivityLog;
use App\Models\Task;

/**
 * Activity logs for a task: subject is always {@see Task} (comments, links, media, etc. log against the task).
 */
final class GetTaskHistoryQuery
{
    public function __construct(
        private readonly string $taskId,
    ) {}

    /**
     * Shape matches {@see TaskHistoryEntry} on the frontend.
     *
     * @return array<int, array{
     *     id: int,
     *     action: string,
     *     description: string,
     *     actor: array{id: int|null, name: string|null}|null,
     *     old_values: array<string, mixed>|null,
     *     new_values: array<string, mixed>|null,
     *     created_at: string
     * }>
     */
    public function handle(): array
    {
        $logs = ActivityLog::query()
            ->where('subject_type', Task::class)
            ->where('subject_id', $this->taskId)
            ->with(['causer:id,name'])
            ->orderByDesc('created_at')
            ->limit(200)
            ->get();

        return $logs->map(static function (ActivityLog $log): array {
            $created = $log->created_at;
            $createdAt = $created !== null
                ? $created->toIso8601String()
                : now()->toIso8601String();

            return [
                'id' => (int) $log->id,
                'action' => $log->event,
                'description' => '',
                'actor' => $log->causer !== null
                    ? [
                        'id' => $log->causer->id,
                        'name' => $log->causer->name,
                    ]
                    : null,
                'old_values' => $log->old_values,
                'new_values' => $log->new_values,
                'created_at' => $createdAt,
            ];
        })->all();
    }
}
