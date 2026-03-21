<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\Task;
use Illuminate\Database\Eloquent\Model;

final class TaskSystemReminderNotification extends BaseAppNotification
{
    public function __construct(
        private readonly Task $task,
    ) {}

    public function getEventCode(): string
    {
        return 'task.system_reminder';
    }

    public function getNotifiable(): ?Model
    {
        return $this->task;
    }

    /**
     * @return array<string, string|int|float|bool|null>
     */
    protected function getVariables(): array
    {
        return [
            'task_title' => $this->task->title,
            'due_at' => $this->task->due_at?->toIso8601String() ?? '',
        ];
    }

    protected function getLink(): ?string
    {
        return '/tasks/' . $this->task->id;
    }
}
