<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\ProjectSystem;
use App\Services\ActivityLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProjectSystemController extends Controller
{
    public function __construct(
        private readonly ActivityLogger $activityLogger,
    ) {}

    public function index(Request $request, Project $project): Response
    {
        $this->authorize('viewAny', [ProjectSystem::class, $project]);

        $systems = $project->systems()
            ->with(['owner:id,name', 'createdBy:id,name'])
            ->withCount('packages')
            ->orderBy('sort_order')
            ->orderBy('name_en')
            ->get();

        return Inertia::render('Projects/Systems/Index', [
            'project' => $project->only('id', 'name', 'name_en', 'name_ar', 'code'),
            'systems' => $systems,
            'can'     => [
                'create' => $request->user()->can('projects.systems.create'),
                'edit'   => $request->user()->can('projects.systems.edit'),
                'delete' => $request->user()->can('projects.systems.delete'),
            ],
        ]);
    }

    public function store(Request $request, Project $project): RedirectResponse
    {
        $this->authorize('create', [ProjectSystem::class, $project]);

        $validated = $request->validate([
            'code'        => 'nullable|string|max:50',
            'name_ar'     => 'nullable|string|max:200',
            'name_en'     => 'required|string|max:200',
            'description' => 'nullable|string',
            'owner_user_id' => 'nullable|integer|exists:users,id',
            'sort_order'  => 'nullable|integer|min:0',
        ]);

        $system = $project->systems()->create([
            ...$validated,
            'created_by_user_id' => $request->user()->id,
        ]);

        $this->activityLogger->log('project_system.created', $system, [], $system->toArray(), $request->user());

        return back()->with('success', 'System created successfully.');
    }

    public function update(Request $request, Project $project, ProjectSystem $system): RedirectResponse
    {
        $this->authorize('update', $system);

        $validated = $request->validate([
            'code'          => 'nullable|string|max:50',
            'name_ar'       => 'nullable|string|max:200',
            'name_en'       => 'required|string|max:200',
            'description'   => 'nullable|string',
            'owner_user_id' => 'nullable|integer|exists:users,id',
            'sort_order'    => 'nullable|integer|min:0',
        ]);

        $system->update($validated);

        $this->activityLogger->log('project_system.updated', $system, [], $system->toArray(), $request->user());

        return back()->with('success', 'System updated successfully.');
    }

    public function destroy(Request $request, Project $project, ProjectSystem $system): RedirectResponse
    {
        $this->authorize('delete', $system);

        $system->delete();

        $this->activityLogger->log('project_system.deleted', $system, $system->toArray(), [], $request->user());

        return back()->with('success', 'System deleted successfully.');
    }
}
