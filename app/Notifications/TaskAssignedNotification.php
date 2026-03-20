<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;

final class TaskAssignedNotification extends BaseAppNotification
{
    /**
     * @param  Model|object  $task  Task or object with id, title, project
     */
    public function __construct(
        public readonly object $task,
        public readonly User $assigner,
    ) {}

    public function getEventCode(): string
    {
        return 'task.assigned';
    }

    public function getNotifiable(): ?Model
    {
        return $this->task instanceof Model ? $this->task : null;
    }

    protected function getActorUserId(): ?int
    {
        return $this->assigner->id;
    }

    /**
     * @return array<string, mixed>
     */
    public function getNotificationMetadata(): array
    {
        $meta = [
            'task_id' => (string) ($this->task->id ?? ''),
        ];
        if (isset($this->task->project_id)) {
            $meta['project_id'] = $this->task->project_id;
        }

        return $meta;
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
