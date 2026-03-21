<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\Task;
use App\Models\TaskComment;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

final class TaskCommentDueNotification extends BaseAppNotification
{
    public function __construct(
        private readonly TaskComment $comment,
        private readonly Task $task,
    ) {}

    public function getEventCode(): string
    {
        return 'task.comment_reminder';
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
            'comment_preview' => Str::limit((string) $this->comment->body, 200),
        ];
    }

    protected function getLink(): ?string
    {
        return '/tasks/' . $this->task->id;
    }
}
