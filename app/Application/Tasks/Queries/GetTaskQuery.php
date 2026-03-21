<?php

declare(strict_types=1);

namespace App\Application\Tasks\Queries;

use App\Models\Task;

final class GetTaskQuery
{
    public function __construct(
        private readonly string $taskId,
    ) {}

    public function handle(): Task
    {
        return Task::with([
            'creator:id,name',
            'project:id,name',
            'assignees:id,name',
            'subtasks:id,parent_task_id,title,status,priority,position',
            'subtasks.creator:id,name',
            'subtasks.assignees:id,name',
            'comments.user:id,name',
            'comments.media',
            'dependencies:id,title,status',
            'links' => fn ($q) => $q->with('linkable'),
            'reminders.user:id,name',
            'media',
        ])->findOrFail($this->taskId);
    }
}
