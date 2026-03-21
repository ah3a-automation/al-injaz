<?php

declare(strict_types=1);

namespace App\Application\Tasks\Commands;

use App\Models\Task;
use App\Models\TaskAssignee;
use App\Models\TaskLink;
use App\Models\User;
use App\Notifications\TaskAssignedNotification;
use App\Services\ActivityLogger;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class CreateTaskCommand
{
    /**
     * @param array<int, array{user_id: string|int, role?: string}> $assignees
     * @param array<int, string>|null $tags
     * @param array<int, array{type: string, id: string}>|null $links
     */
    public function __construct(
        private readonly string $title,
        private readonly string $createdByUserId,
        private readonly ?string $projectId = null,
        private readonly string $status = Task::STATUS_BACKLOG,
        private readonly string $priority = Task::PRIORITY_NORMAL,
        private readonly ?string $description = null,
        private readonly ?string $parentTaskId = null,
        private readonly ?string $dueAt = null,
        private readonly ?string $startAt = null,
        private readonly ?float $estimatedHours = null,
        private readonly int $progressPercent = 0,
        private readonly int $position = 0,
        private readonly string $visibility = 'team',
        private readonly string $source = 'manual',
        private readonly array $assignees = [],
        private readonly ?User $actor = null,
        private readonly ?array $tags = null,
        private readonly ?string $reminderAt = null,
        private readonly ?array $links = null,
        private readonly ?ActivityLogger $activityLogger = null,
    ) {}

    public function handle(): Task
    {
        $task = null;

        DB::transaction(function () use (&$task) {
            $task = Task::create([
                'id' => (string) Str::uuid(),
                'project_id' => $this->projectId,
                'parent_task_id' => $this->parentTaskId,
                'created_by_user_id' => (int) $this->createdByUserId,
                'title' => $this->title,
                'description' => $this->description,
                'status' => $this->status,
                'priority' => $this->priority,
                'due_at' => $this->dueAt,
                'start_at' => $this->startAt,
                'estimated_hours' => $this->estimatedHours,
                'progress_percent' => $this->progressPercent,
                'position' => $this->position,
                'visibility' => $this->visibility,
                'source' => $this->source,
                'tags' => $this->tags,
                'reminder_at' => $this->reminderAt,
            ]);

            foreach ($this->assignees as $assignee) {
                $task->assignees()->attach(
                    $assignee['user_id'],
                    ['role' => $assignee['role'] ?? TaskAssignee::ROLE_RESPONSIBLE]
                );
            }

            if ($this->links !== null && $this->links !== []) {
                foreach ($this->links as $link) {
                    TaskLink::create([
                        'task_id' => $task->id,
                        'linkable_type' => TaskLink::resolveClass($link['type']),
                        'linkable_id' => $link['id'],
                        'created_by_user_id' => (int) $this->createdByUserId,
                    ]);
                }
            }

            DB::afterCommit(function () use ($task) {
                $logger = $this->activityLogger ?? app(ActivityLogger::class);

                if ($this->actor !== null) {
                    foreach ($this->assignees as $a) {
                        $logger->log(
                            'tasks.assignee.added',
                            $task->fresh(),
                            [],
                            [
                                'user_id' => (int) $a['user_id'],
                                'role' => $a['role'] ?? TaskAssignee::ROLE_RESPONSIBLE,
                            ],
                            $this->actor
                        );
                    }
                }

                if ($this->actor === null) {
                    return;
                }

                $freshTask = $task->fresh(['project']);
                $assigneeIds = $freshTask->assignees()->pluck('users.id')->toArray();
                $actorId = $this->actor->id;

                $targetIds = array_values(array_unique(
                    array_filter($assigneeIds, fn ($id) => (int) $id !== $actorId)
                ));
                if ($targetIds === []) {
                    return;
                }

                $assignees = User::whereIn('id', $targetIds)->get();
                if ($assignees->isEmpty()) {
                    return;
                }

                foreach ($assignees as $assignee) {
                    $assignee->notify(new TaskAssignedNotification($freshTask, $this->actor));
                }
            });
        });

        return $task;
    }
}
