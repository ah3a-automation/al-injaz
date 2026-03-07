<?php

declare(strict_types=1);

namespace App\Http\Controllers;


use App\Application\Projects\Commands\CreateProjectCommand;
use App\Application\Projects\Commands\DeleteProjectCommand;
use App\Application\Projects\Commands\UpdateProjectCommand;
use App\Application\Projects\DTOs\ProjectFilterDTO;
use App\Application\Projects\Queries\FindProjectQuery;
use App\Application\Projects\Queries\ListProjectsQuery;
use App\Application\Projects\DTOs\CreateProjectDTO;
use App\Application\Projects\DTOs\UpdateProjectDTO;
use App\Http\Requests\Projects\StoreProjectRequest;
use App\Http\Requests\Projects\UpdateProjectRequest;
use App\Models\Project;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use App\Http\Controllers\Controller;


final class ProjectController extends Controller
{
    public function __construct(
        private readonly ListProjectsQuery $listQuery,
        private readonly FindProjectQuery $findQuery,
        private readonly CreateProjectCommand $createCommand,
        private readonly UpdateProjectCommand $updateCommand,
        private readonly DeleteProjectCommand $deleteCommand,
    ) {}

    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Project::class);

        $filter = ProjectFilterDTO::fromRequest($request);
        $result = $this->listQuery->execute($filter);

        $user = $request->user();

        return Inertia::render('Projects/Index', [
            'projects' => [
                'items' => $result->items,
                'total' => $result->total,
                'current_page' => $result->currentPage,
                'per_page' => $result->perPage,
                'last_page' => $result->lastPage,
            ],
            'filters' => [
                'q' => $filter->q,
                'status' => $filter->status,
                'owner_id' => $filter->ownerId,
                'date_from' => $filter->dateFrom,
                'date_to' => $filter->dateTo,
                'sort_field' => $filter->sortField,
                'sort_dir' => $filter->sortDir,
                'page' => $filter->page,
                'per_page' => $filter->perPage,
            ],
            'can' => [
                'create' => $user->can('projects.create'),
                'update' => $user->can('projects.update'),
                'delete' => $user->can('projects.delete'),
            ],
        ]);
    }

    public function create(): Response
    {
        $this->authorize('create', Project::class);

        return Inertia::render('Projects/Create');
    }

    public function store(StoreProjectRequest $request): RedirectResponse
    {
        $this->authorize('create', Project::class);

        $dto = CreateProjectDTO::fromRequest($request);
        $this->createCommand->execute($dto, $request->user());

        return redirect()->route('projects.index')->with('success', 'Project created.');
    }

    public function show(string $id, Request $request): Response
    {
        $project = $this->findQuery->execute($id);
        $this->authorize('view', $project);

        return Inertia::render('Projects/Show', [
            'project' => $project,
            'can' => [
                'update' => $request->user()->can('update', $project),
                'delete' => $request->user()->can('delete', $project),
            ],
        ]);
    }

    public function edit(string $id): Response
    {
        $project = $this->findQuery->execute($id);
        $this->authorize('update', $project);

        return Inertia::render('Projects/Edit', [
            'project' => $project,
        ]);
    }

    public function update(UpdateProjectRequest $request, string $id): RedirectResponse
    {
        $project = $this->findQuery->execute($id);
        $this->authorize('update', $project);

        $dto = UpdateProjectDTO::fromRequest($request);
        $this->updateCommand->execute($project, $dto, $request->user());

        return redirect()->route('projects.index')->with('success', 'Project updated.');
    }

    public function destroy(string $id, Request $request): RedirectResponse
    {
        $project = $this->findQuery->execute($id);
        $this->authorize('delete', $project);

        $this->deleteCommand->execute($project, $request->user());

        return redirect()->route('projects.index')->with('success', 'Project deleted.');
    }
    public function bulkDestroy(Request $request): RedirectResponse
    {
        $user = $request->user();
        
        if (!$user) {
            abort(401, 'Not authenticated');
        }
        
        if (!$user->can('projects.delete')) {
            abort(403, 'Missing projects.delete — user id: ' . $user->id);
        }

        $ids = $request->input('ids', []);
        Project::whereIn('id', $ids)->delete();

        return redirect()->route('projects.index')
            ->with('success', count($ids) . ' projects deleted.');
    }
}
