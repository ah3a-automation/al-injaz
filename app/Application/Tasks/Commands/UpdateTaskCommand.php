<?php

declare(strict_types=1);

namespace App\Application\Tasks\Commands;

use App\Notifications\TaskAssignedNotification;
use App\Models\Task;
use App\Models\TaskAssignee;
use App\Models\User;
use App\Services\Notifications\NotificationEngineBridge;
use App\Services\Notifications\NotificationEventContext;
use App\Services\System\NotificationService;
use Illuminate\Support\Facades\DB;

final class UpdateTaskCommand
{
    /**
     * @param array<string, mixed> $data
     * @param array<int, array{user_id: string|int, role?: string}>|null $assignees
     */
    public function __construct(
        private readonly Task $task,
        private readonly array $data,
        private readonly NotificationEngineBridge $notificationEngineBridge,
        private readonly NotificationService $notificationService,
        private readonly ?array $assignees = null,
        private readonly ?User $actor = null,
    ) {}

    public function handle(): Task
    {
        $previousAssigneeIds = $this->assignees !== null
            ? $this->task->assignees()->pluck('users.id')->toArray()
            : [];

        DB::transaction(function () use ($previousAssigneeIds) {
            $this->task->update($this->data);

            if ($this->assignees !== null) {
                $this->task->assignees()->sync(
                    collect($this->assignees)->mapWithKeys(fn ($a) => [
                        $a['user_id'] => ['role' => $a['role'] ?? TaskAssignee::ROLE_RESPONSIBLE],
                    ])->all()
                );
            }

            DB::afterCommit(function () use ($previousAssigneeIds) {
                if ($this->actor === null) {
                    return;
                }
                if ($this->assignees === null) {
                    return;
                }

                $currentAssigneeIds = $this->task->fresh()
                    ->assignees()->pluck('users.id')->toArray();

                $newAssigneeIds = array_values(array_diff(
                    array_unique($currentAssigneeIds),
                    array_unique($previousAssigneeIds)
                ));

                $actorId = $this->actor->id;
                $targetIds = array_values(array_filter(
                    $newAssigneeIds,
                    fn ($id) => $id !== $actorId
                ));

                if (empty($targetIds)) {
                    return;
                }

                $freshTask = $this->task->fresh(['project']);
                $assignees = User::whereIn('id', $targetIds)->get();
                if ($assignees->isEmpty()) {
                    return;
                }

                $eventKey = 'task.assigned';
                $taskNotification = new TaskAssignedNotification($freshTask, $this->actor);
                $rendered = $taskNotification->toArray($assignees->first());

                $title = is_string($rendered['title'] ?? null) ? $rendered['title'] : $eventKey;
                $message = is_string($rendered['body'] ?? null) ? $rendered['body'] : '';
                $link = is_string($rendered['link'] ?? null) ? $rendered['link'] : '';

                $metadata = [
                    'task_id' => (string) $freshTask->id,
                    'project_id' => $freshTask->project?->id,
                ];

                $context = new NotificationEventContext([
                    'title' => $title,
                    'message' => $message,
                    'link' => $link,
                    'metadata' => $metadata,
                    'assigned_user_ids' => array_values(array_unique($targetIds)),
                ]);

                $this->notificationEngineBridge->dispatchOrLegacy(
                    $eventKey,
                    $context,
                    legacyDispatch: function () use ($assignees, $eventKey, $title, $message, $link, $metadata): void {
                        $this->notificationService->notifyUsers(
                            $assignees,
                            $eventKey,
                            $title,
                            $message,
                            $link,
                            $metadata
                        );
                    }
                );
            });
        });

        return $this->task->fresh();
    }

    /**
     * When adding dependencies, validate that the new dependency does not create a circular chain.
     */
    private function wouldCreateCycle(string $taskId, string $dependsOnId): bool
    {
        $visited = [];
        $queue = [$dependsOnId];

        while (! empty($queue)) {
            $current = array_shift($queue);
            if ($current === $taskId) {
                return true;
            }
            if (isset($visited[$current])) {
                continue;
            }
            $visited[$current] = true;
            $deps = DB::table('task_dependencies')
                ->where('task_id', $current)
                ->pluck('depends_on_task_id');
            foreach ($deps as $dep) {
                $queue[] = $dep;
            }
        }

        return false;
    }
}
