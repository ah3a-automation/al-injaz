<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Application\Tasks\Commands\CreateTaskCommand;
use App\Application\Tasks\Commands\DeleteTaskCommand;
use App\Application\Tasks\Commands\UpdateTaskCommand;
use App\Application\Tasks\Queries\GetTaskHistoryQuery;
use App\Application\Tasks\Queries\GetTaskQuery;
use App\Application\Tasks\Queries\ListTasksQuery;
use App\Http\Requests\Tasks\StoreTaskRequest;
use App\Http\Requests\Tasks\UpdateTaskRequest;
use App\Models\Project;
use App\Models\Task;
use App\Models\TaskLink;
use App\Models\TaskReminder;
use App\Models\User;
use App\Services\ActivityLogger;
use App\Services\MediaManager;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

final class TaskController extends Controller
{
    public function __construct(
        private readonly ActivityLogger $activityLogger,
        private readonly MediaManager $mediaManager,
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
            actor: $request->user(),
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

        $linkPayload = null;
        if (! empty($validated['links'])) {
            $linkPayload = array_map(
                fn (array $l) => ['type' => $l['type'], 'id' => $l['id']],
                $validated['links']
            );
        }

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
            tags: $validated['tags'] ?? null,
            reminderAt: $validated['reminder_at'] ?? null,
            links: $linkPayload,
            activityLogger: $this->activityLogger,
        );
        $task = $command->handle();

        $this->activityLogger->log(
            'tasks.task.created',
            $task,
            [],
            $task->toArray(),
            $request->user(),
            [
                'links' => $validated['links'] ?? [],
                'tags' => $validated['tags'] ?? null,
            ]
        );

        return redirect()->route('tasks.index')->with('success', __('tasks.flash_created'));
    }

    public function show(Request $request, Task $task): Response
    {
        $this->authorize('view', $task);

        $getTaskQuery = new GetTaskQuery($task->id);
        $task = $getTaskQuery->handle();

        $historyQuery = new GetTaskHistoryQuery($task->id);
        $history = $historyQuery->handle();

        return Inertia::render('Tasks/Show', [
            'task' => $task,
            'history' => $history,
            'can' => [
                'update' => $request->user()->can('tasks.edit', $task),
                'delete' => $request->user()->can('tasks.delete', $task),
            ],
        ]);
    }

    public function reorder(Request $request, Task $task): RedirectResponse
    {
        $this->authorize('update', $task);

        $validated = $request->validate([
            'direction' => ['required', 'string', 'in:up,down'],
        ]);

        DB::transaction(function () use ($task, $validated): void {
            $locked = Task::query()->whereKey($task->id)->lockForUpdate()->firstOrFail();
            $parentId = $locked->parent_task_id;
            $status = $locked->status;

            $siblings = Task::query()
                ->where('parent_task_id', $parentId)
                ->where('status', $status)
                ->orderBy('position')
                ->orderBy('id')
                ->lockForUpdate()
                ->get();

            $idx = $siblings->search(fn (Task $t) => $t->id === $locked->id);
            if ($idx === false) {
                return;
            }

            $swapIdx = $validated['direction'] === 'up' ? $idx - 1 : $idx + 1;
            if ($swapIdx < 0 || $swapIdx >= $siblings->count()) {
                return;
            }

            $ordered = $siblings->values();
            $a = $ordered[$idx];
            $b = $ordered[$swapIdx];
            $ordered[$idx] = $b;
            $ordered[$swapIdx] = $a;

            foreach ($ordered as $i => $t) {
                Task::query()->whereKey($t->id)->update(['position' => $i]);
            }
        });

        return back();
    }

    public function edit(Request $request, Task $task): Response
    {
        $this->authorize('update', $task);

        $task->load(['assignees', 'project', 'creator', 'links']);
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

        $oldSnapshot = $task->only([
            'title', 'description', 'status', 'priority', 'due_at', 'tags', 'reminder_at',
            'project_id', 'parent_task_id', 'visibility', 'source', 'estimated_hours', 'progress_percent',
        ]);

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

        if (array_key_exists('tags', $validated)) {
            $data['tags'] = $validated['tags'];
        }
        if (array_key_exists('reminder_at', $validated)) {
            $data['reminder_at'] = $validated['reminder_at'];
        }

        $assignees = isset($validated['assignees'])
            ? array_map(fn ($a) => ['user_id' => $a['user_id'], 'role' => $a['role']], $validated['assignees'])
            : null;

        $linksPayload = $request->has('links')
            ? array_map(
                fn (array $l) => ['type' => $l['type'], 'id' => $l['id']],
                $validated['links'] ?? []
            )
            : null;

        $command = new UpdateTaskCommand(
            task: $task,
            data: $data,
            assignees: $assignees,
            links: $linksPayload,
            actor: $request->user(),
            activityLogger: $this->activityLogger,
        );
        $task = $command->handle();

        $newSnapshot = $task->only([
            'title', 'description', 'status', 'priority', 'due_at', 'tags', 'reminder_at',
            'project_id', 'parent_task_id', 'visibility', 'source', 'estimated_hours', 'progress_percent',
        ]);

        $this->activityLogger->log(
            'tasks.task.updated',
            $task,
            $oldSnapshot,
            $newSnapshot,
            $request->user()
        );

        return redirect()->route('tasks.show', $task)->with('success', __('tasks.flash_updated'));
    }

    public function destroy(Request $request, Task $task): RedirectResponse
    {
        $this->authorize('delete', $task);

        $payload = $task->toArray();
        $command = new DeleteTaskCommand($task);
        $command->handle();

        $this->activityLogger->log('tasks.task.deleted', $task, $payload, [], $request->user());

        return redirect()->route('tasks.index')->with('success', __('tasks.flash_deleted'));
    }

    public function storeLink(Request $request, Task $task): RedirectResponse
    {
        $this->authorize('manageLinks', $task);

        $validated = $request->validate([
            'type' => ['required', 'string', 'in:project,supplier,rfq,package,contract,purchase_request'],
            'id' => ['required', 'string'],
        ]);

        if (! TaskLink::linkExists($validated['type'], $validated['id'])) {
            return back()->withErrors(['id' => __('tasks.link_entity_not_found')]);
        }

        TaskLink::create([
            'task_id' => $task->id,
            'linkable_type' => TaskLink::resolveClass($validated['type']),
            'linkable_id' => $validated['id'],
            'created_by_user_id' => $request->user()->id,
        ]);

        $this->activityLogger->log(
            'tasks.link.added',
            $task->fresh(),
            [],
            [
                'linkable_type' => TaskLink::resolveClass($validated['type']),
                'linkable_id' => $validated['id'],
            ],
            $request->user()
        );

        return back()->with('success', __('tasks.flash_link_added'));
    }

    public function destroyLink(Request $request, Task $task, TaskLink $link): RedirectResponse
    {
        $this->authorize('manageLinks', $task);

        if ($link->task_id !== $task->id) {
            abort(404);
        }

        $this->activityLogger->log(
            'tasks.link.removed',
            $task,
            [
                'linkable_type' => $link->linkable_type,
                'linkable_id' => $link->linkable_id,
            ],
            [],
            $request->user()
        );

        $link->delete();

        return back()->with('success', __('tasks.flash_link_removed'));
    }

    public function storeReminder(Request $request, Task $task): RedirectResponse
    {
        $this->authorize('manageReminders', $task);

        $validated = $request->validate([
            'user_id' => ['required', 'exists:users,id'],
            'remind_at' => ['required', 'date'],
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        TaskReminder::create([
            'task_id' => $task->id,
            'user_id' => (int) $validated['user_id'],
            'remind_at' => $validated['remind_at'],
            'note' => $validated['note'] ?? null,
            'is_sent' => false,
        ]);

        $this->activityLogger->log(
            'tasks.reminder.set',
            $task->fresh(),
            [],
            [
                'user_id' => (int) $validated['user_id'],
                'remind_at' => $validated['remind_at'],
            ],
            $request->user()
        );

        return back()->with('success', __('tasks.flash_reminder_set'));
    }

    public function destroyReminder(Request $request, Task $task, TaskReminder $reminder): RedirectResponse
    {
        $this->authorize('manageReminders', $task);

        if ($reminder->task_id !== $task->id) {
            abort(404);
        }

        $reminder->delete();

        return back()->with('success', __('tasks.flash_reminder_removed'));
    }

    public function storeMedia(Request $request, Task $task): RedirectResponse
    {
        $this->authorize('manageMedia', $task);

        $request->validate([
            'file' => ['required', 'file', 'max:20480'],
        ]);

        $file = $request->file('file');
        $media = $this->mediaManager->attachToModel($task, $file, 'task_files', false);

        $this->activityLogger->log(
            'tasks.attachment.added',
            $task->fresh(),
            [],
            ['file_name' => $media->file_name],
            $request->user()
        );

        return back()->with('success', __('tasks.flash_attachment_added'));
    }

    public function destroyMedia(Request $request, Task $task, Media $media): RedirectResponse
    {
        $this->authorize('manageMedia', $task);

        if ((string) $media->model_id !== (string) $task->id || $media->model_type !== Task::class) {
            abort(404);
        }

        $fileName = $media->file_name;
        $this->mediaManager->delete($media);

        $this->activityLogger->log(
            'tasks.attachment.removed',
            $task->fresh(),
            ['file_name' => $fileName],
            [],
            $request->user()
        );

        return back()->with('success', __('tasks.flash_attachment_removed'));
    }
}
