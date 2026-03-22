<?php

declare(strict_types=1);

namespace App\Application\Tasks\Queries;

use App\Models\Task;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

final class ListTasksQuery
{
    private const ALLOWED_SORT_FIELDS = [
        'position',
        'due_at',
        'created_at',
        'priority',
        'status',
    ];

    public function __construct(
        private readonly ?string $projectId = null,
        private readonly ?string $status = null,
        private readonly ?string $priority = null,
        private readonly ?string $assigneeId = null,
        private readonly ?string $createdById = null,
        private readonly ?string $q = null,
        private readonly ?string $parentTaskId = null,
        private readonly bool $includeSubtasks = false,
        private readonly string $sortField = 'position',
        private readonly string $sortDir = 'asc',
        private readonly int $perPage = 25,
        private readonly int $page = 1,
        private readonly ?User $actor = null,
        private readonly ?string $due = null,
    ) {}

    public function handle(): LengthAwarePaginator
    {
        $sortField = in_array($this->sortField, self::ALLOWED_SORT_FIELDS, true)
            ? $this->sortField
            : 'position';
        $sortDir = $this->sortDir === 'desc' ? 'desc' : 'asc';

        return Task::query()
            ->with([
                'creator:id,name',
                'project:id,name',
                'assignees:id,name',
                'subtasks:id,parent_task_id,title,status,priority,position',
            ])
            ->when($this->projectId, fn ($q) => $q->where('project_id', $this->projectId))
            ->when(! $this->includeSubtasks && ! $this->parentTaskId, fn ($q) => $q->whereNull('parent_task_id'))
            ->when($this->parentTaskId, fn ($q) => $q->where('parent_task_id', $this->parentTaskId))
            ->when($this->status === 'overdue', function ($q): void {
                $q->whereNotNull('due_at')
                    ->where('due_at', '<', now())
                    ->whereNotIn('status', [Task::STATUS_DONE, Task::STATUS_CANCELLED]);
            })
            ->when($this->status !== null && $this->status !== '' && $this->status !== 'overdue', fn ($q) => $q->where('status', $this->status))
            ->when($this->priority, fn ($q) => $q->where('priority', $this->priority))
            ->when($this->assigneeId, fn ($q) => $q->whereHas('assignees', fn ($a) => $a->where('users.id', $this->assigneeId)))
            ->when($this->due === 'today', function ($q): void {
                $q->whereNotNull('due_at')
                    ->whereDate('due_at', now()->toDateString())
                    ->whereNotIn('status', [Task::STATUS_DONE, Task::STATUS_CANCELLED]);
            })
            ->when($this->createdById, fn ($q) => $q->where('created_by_user_id', $this->createdById))
            ->when($this->q, fn ($query) => $query->where(fn ($inner) => $inner
                ->where('title', 'ilike', '%' . $this->q . '%')
                ->orWhere('description', 'ilike', '%' . $this->q . '%')))
            ->when(
                $this->actor !== null && $this->actor->hasRole(User::ROLE_SUPPLIER),
                fn ($q) => $q->whereHas(
                    'assignees',
                    fn ($a) => $a->where('users.id', $this->actor->id)
                )
            )
            ->orderBy($sortField, $sortDir)
            ->paginate($this->perPage, ['*'], 'page', $this->page);
    }
}
