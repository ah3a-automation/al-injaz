<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\User;

class TaskAssignedNotification extends BaseAppNotification
{
    /**
     * @param object $task Object with id, title, project (optional with name)
     */
    public function __construct(
        public readonly object $task,
        public readonly User $assigner,
    ) {}

    protected function getEventCode(): string
    {
        return 'task.assigned';
    }

    /**
     * @return array<string, string|int|float|bool|null>
     */
    protected function getVariables(): array
    {
        $projectName = isset($this->task->project) && is_object($this->task->project) && isset($this->task->project->name)
            ? $this->task->project->name
            : 'N/A';

        return [
            'task_title' => $this->task->title ?? '',
            'project_name' => $projectName,
            'assigned_by' => $this->assigner->name,
        ];
    }

    protected function getLink(): ?string
    {
        return "/tasks/{$this->task->id}";
    }
}
