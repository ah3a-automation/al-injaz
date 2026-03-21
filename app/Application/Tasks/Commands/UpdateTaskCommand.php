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

final class UpdateTaskCommand
{
    /**
     * @param array<string, mixed> $data
     * @param array<int, array{user_id: string|int, role?: string}>|null $assignees
     * @param array<int, array{type: string, id: string}>|null $links
     */
    public function __construct(
        private readonly Task $task,
        private readonly array $data,
        private readonly ?array $assignees = null,
        private readonly ?array $links = null,
        private readonly ?User $actor = null,
        private readonly ?ActivityLogger $activityLogger = null,
    ) {}

    public function handle(): Task
    {
        $previousAssigneeIds = $this->assignees !== null
            ? $this->task->assignees()->pluck('users.id')->toArray()
            : [];

        $oldStatus = $this->task->status;
        $oldLinksSnapshot = $this->links !== null
            ? $this->task->links()->get(['linkable_type', 'linkable_id'])
            : null;

        DB::transaction(function () use ($previousAssigneeIds, $oldStatus, $oldLinksSnapshot) {
            $this->task->update($this->data);

            if ($this->assignees !== null) {
                $this->task->assignees()->sync(
                    collect($this->assignees)->mapWithKeys(fn ($a) => [
                        $a['user_id'] => ['role' => $a['role'] ?? TaskAssignee::ROLE_RESPONSIBLE],
                    ])->all()
                );
            }

            if ($this->links !== null) {
                $this->task->links()->delete();
                foreach ($this->links as $link) {
                    TaskLink::create([
                        'task_id' => $this->task->id,
                        'linkable_type' => TaskLink::resolveClass($link['type']),
                        'linkable_id' => $link['id'],
                        'created_by_user_id' => $this->actor?->id ?? $this->task->created_by_user_id,
                    ]);
                }
            }

            DB::afterCommit(function () use ($previousAssigneeIds, $oldStatus, $oldLinksSnapshot) {
                $logger = $this->activityLogger ?? app(ActivityLogger::class);
                $fresh = $this->task->fresh();

                if ($fresh === null) {
                    return;
                }

                if (isset($this->data['status']) && $oldStatus !== $fresh->status) {
                    $logger->log(
                        'tasks.status.changed',
                        $fresh,
                        ['status' => $oldStatus],
                        ['status' => $fresh->status],
                        $this->actor
                    );
                }

                if ($this->assignees !== null) {
                    $currentIds = $fresh->assignees()->pluck('users.id')->toArray();
                    $added = array_values(array_diff($currentIds, $previousAssigneeIds));
                    $removed = array_values(array_diff($previousAssigneeIds, $currentIds));

                    foreach ($added as $userId) {
                        $roleRow = collect($this->assignees)->first(
                            fn (array $a) => (int) $a['user_id'] === (int) $userId
                        );
                        $roleValue = is_array($roleRow)
                            ? ($roleRow['role'] ?? TaskAssignee::ROLE_RESPONSIBLE)
                            : TaskAssignee::ROLE_RESPONSIBLE;
                        $logger->log(
                            'tasks.assignee.added',
                            $fresh,
                            [],
                            ['user_id' => (int) $userId, 'role' => $roleValue],
                            $this->actor
                        );
                    }

                    foreach ($removed as $userId) {
                        $logger->log(
                            'tasks.assignee.removed',
                            $fresh,
                            ['user_id' => (int) $userId],
                            [],
                            $this->actor
                        );
                    }
                }

                if ($oldLinksSnapshot !== null && $this->links !== null) {
                    $oldKeys = $oldLinksSnapshot->map(fn ($l) => $l->linkable_type . '|' . $l->linkable_id)->sort()->values()->all();
                    $newKeys = collect($this->links)->map(fn ($l) => TaskLink::resolveClass($l['type']) . '|' . $l['id'])->sort()->values()->all();

                    foreach (array_diff($newKeys, $oldKeys) as $key) {
                        [$type, $id] = explode('|', $key, 2);
                        $logger->log(
                            'tasks.link.added',
                            $fresh,
                            [],
                            ['linkable_type' => $type, 'linkable_id' => $id],
                            $this->actor
                        );
                    }

                    foreach (array_diff($oldKeys, $newKeys) as $key) {
                        [$type, $id] = explode('|', $key, 2);
                        $logger->log(
                            'tasks.link.removed',
                            $fresh,
                            ['linkable_type' => $type, 'linkable_id' => $id],
                            [],
                            $this->actor
                        );
                    }
                }

                if ($this->assignees === null) {
                    return;
                }

                $currentAssigneeIds = $fresh->assignees()->pluck('users.id')->toArray();

                $newAssigneeIds = array_values(array_diff(
                    array_unique($currentAssigneeIds),
                    array_unique($previousAssigneeIds)
                ));

                $actorId = $this->actor?->id;
                $targetIds = array_values(array_filter(
                    $newAssigneeIds,
                    fn ($id) => $actorId === null || (int) $id !== (int) $actorId
                ));

                if ($targetIds === []) {
                    return;
                }

                $taskForNotify = $this->task->fresh(['project']);
                if ($taskForNotify === null) {
                    return;
                }

                $assignees = User::whereIn('id', $targetIds)->get();
                if ($assignees->isEmpty()) {
                    return;
                }

                foreach ($assignees as $assignee) {
                    $assignee->notify(new TaskAssignedNotification($taskForNotify, $this->actor));
                }
            });
        });

        return $this->task->fresh();
    }
}
