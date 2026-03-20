<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Application\Tasks\Commands\CreateTaskCommand;
use App\Application\Tasks\Commands\DeleteTaskCommand;
use App\Application\Tasks\Commands\UpdateTaskCommand;
use App\Application\Tasks\Queries\GetTaskQuery;
use App\Application\Tasks\Queries\ListTasksQuery;
use App\Http\Requests\Tasks\StoreTaskRequest;
use App\Http\Requests\Tasks\UpdateTaskRequest;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Services\ActivityLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

final class TaskController extends Controller
{
    public function __construct(
        private readonly ActivityLogger $activityLogger,
    ) {}

    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Task::class);

        $listQuery = new ListTasksQuery(
            projectId: $request->input('project_id'),
            status: $request->input('status'),
            priority: $request->input('priority'),
            assigneeId: $request->input('assignee_id'),
            createdById: $request->input('created_by_id'),
            q: $request->input('q'),
            parentTaskId: $request->input('parent_task_id'),
            includeSubtasks: (bool) $request->boolean('include_subtasks'),
            sortField: (string) $request->input('sort_field', 'position'),
            sortDir: (string) $request->input('sort_dir', 'asc'),
            perPage: (int) $request->input('per_page', 25),
            page: (int) $request->input('page', 1),
        );
        $tasks = $listQuery->handle();

        $projects = Project::query()->orderBy('name')->get(['id', 'name']);
        $users = User::query()->orderBy('name')->get(['id', 'name']);

        return Inertia::render('Tasks/Index', [
            'tasks' => $tasks,
            'filters' => [
                'q' => $request->input('q'),
                'project_id' => $request->input('project_id'),
                'status' => $request->input('status'),
                'priority' => $request->input('priority'),
                'assignee_id' => $request->input('assignee_id'),
                'created_by_id' => $request->input('created_by_id'),
                'parent_task_id' => $request->input('parent_task_id'),
                'include_subtasks' => $request->boolean('include_subtasks'),
                'sort_field' => $request->input('sort_field', 'position'),
                'sort_dir' => $request->input('sort_dir', 'asc'),
                'page' => $request->input('page', 1),
                'per_page' => $request->input('per_page', 25),
            ],
            'projects' => $projects,
            'users' => $users,
            'can' => [
                'create' => $request->user()->can('tasks.create'),
                'update' => $request->user()->can('tasks.edit'),
                'delete' => $request->user()->can('tasks.delete'),
            ],
        ]);
    }

    public function create(Request $request): Response
    {
        $this->authorize('create', Task::class);

        $projects = Project::query()->orderBy('name')->get(['id', 'name']);
        $users = User::query()->orderBy('name')->get(['id', 'name']);
        $parentTasks = Task::query()->whereNull('parent_task_id')->orderBy('position')->get(['id', 'title']);

        return Inertia::render('Tasks/Create', [
            'projects' => $projects,
            'users' => $users,
            'parentTasks' => $parentTasks,
        ]);
    }

    public function store(StoreTaskRequest $request): RedirectResponse
    {
        $this->authorize('create', Task::class);

        $validated = $request->validated();
        $assignees = array_map(fn ($a) => [
            'user_id' => $a['user_id'],
            'role' => $a['role'],
        ], $validated['assignees'] ?? []);

        $command = new CreateTaskCommand(
            title: $validated['title'],
            createdByUserId: (string) $request->user()->id,
            projectId: $validated['project_id'] ?? null,
            status: $validated['status'] ?? Task::STATUS_BACKLOG,
            priority: $validated['priority'] ?? Task::PRIORITY_NORMAL,
            description: $validated['description'] ?? null,
            parentTaskId: $validated['parent_task_id'] ?? null,
            dueAt: $validated['due_at'] ?? null,
            startAt: $validated['start_at'] ?? null,
            estimatedHours: isset($validated['estimated_hours']) ? (float) $validated['estimated_hours'] : null,
            progressPercent: (int) ($validated['progress_percent'] ?? 0),
            visibility: $validated['visibility'] ?? 'team',
            source: $validated['source'] ?? 'manual',
            assignees: $assignees,
            actor: $request->user(),
        );
        $task = $command->handle();

        $this->activityLogger->log('tasks.task.created', $task, [], $task->toArray(), $request->user());

        return redirect()->route('tasks.index')->with('success', 'Task created.');
    }

    public function show(Request $request, Task $task): Response
    {
        $this->authorize('view', $task);

        $getTaskQuery = new GetTaskQuery($task->id);
        $task = $getTaskQuery->handle();

        return Inertia::render('Tasks/Show', [
            'task' => $task,
            'can' => [
                'update' => $request->user()->can('tasks.edit', $task),
                'delete' => $request->user()->can('tasks.delete', $task),
            ],
        ]);
    }

    public function edit(Request $request, Task $task): Response
    {
        $this->authorize('update', $task);

        $task->load(['assignees', 'project', 'creator']);
        $projects = Project::query()->orderBy('name')->get(['id', 'name']);
        $users = User::query()->orderBy('name')->get(['id', 'name']);
        $parentTasks = Task::query()->whereNull('parent_task_id')->orderBy('position')->get(['id', 'title']);

        return Inertia::render('Tasks/Edit', [
            'task' => $task,
            'projects' => $projects,
            'users' => $users,
            'parentTasks' => $parentTasks,
        ]);
    }

    public function update(UpdateTaskRequest $request, Task $task): RedirectResponse
    {
        $this->authorize('update', $task);

        $validated = $request->validated();
        $data = array_filter([
            'title' => $validated['title'],
            'project_id' => $validated['project_id'] ?? null,
            'parent_task_id' => $validated['parent_task_id'] ?? null,
            'description' => $validated['description'] ?? null,
            'status' => $validated['status'] ?? null,
            'priority' => $validated['priority'] ?? null,
            'due_at' => $validated['due_at'] ?? null,
            'start_at' => $validated['start_at'] ?? null,
            'estimated_hours' => isset($validated['estimated_hours']) ? (float) $validated['estimated_hours'] : null,
            'progress_percent' => isset($validated['progress_percent']) ? (int) $validated['progress_percent'] : null,
            'visibility' => $validated['visibility'] ?? null,
            'source' => $validated['source'] ?? null,
        ], fn ($v) => $v !== null);

        $assignees = isset($validated['assignees'])
            ? array_map(fn ($a) => ['user_id' => $a['user_id'], 'role' => $a['role']], $validated['assignees'])
            : null;

        $command = new UpdateTaskCommand(
            task: $task,
            data: $data,
            assignees: $assignees,
            actor: $request->user(),
        );
        $task = $command->handle();

        $this->activityLogger->log('tasks.task.updated', $task, [], $task->toArray(), $request->user());

        return redirect()->route('tasks.show', $task)->with('success', 'Task updated.');
    }

    public function destroy(Request $request, Task $task): RedirectResponse
    {
        $this->authorize('delete', $task);

        $payload = $task->toArray();
        $command = new DeleteTaskCommand($task);
        $command->handle();

        $this->activityLogger->log('tasks.task.deleted', $task, $payload, [], $request->user());

        return redirect()->route('tasks.index')->with('success', 'Task deleted.');
    }
}
