<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\ProjectPackage;
use App\Services\ActivityLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProjectPackageController extends Controller
{
    public function __construct(
        private readonly ActivityLogger $activityLogger,
    ) {}

    public function index(Request $request, Project $project): Response
    {
        $this->authorize('viewAny', [ProjectPackage::class, $project]);

        $packages = $project->packages()
            ->with(['system:id,name_en,code', 'createdBy:id,name'])
            ->withCount('boqItems')
            ->orderBy('status')
            ->orderBy('name_en')
            ->get();

        $systems = $project->systems()
            ->orderBy('sort_order')
            ->get(['id', 'name_en', 'name_ar', 'code']);

        return Inertia::render('Projects/Packages/Index', [
            'project'  => $project->only('id', 'name', 'name_en', 'name_ar', 'code'),
            'packages' => $packages,
            'systems'  => $systems,
            'can'      => [
                'create' => $request->user()->can('projects.packages.create'),
                'edit'   => $request->user()->can('projects.packages.edit'),
                'delete' => $request->user()->can('projects.packages.delete'),
            ],
        ]);
    }

    public function store(Request $request, Project $project): RedirectResponse
    {
        $this->authorize('create', [ProjectPackage::class, $project]);

        $validated = $request->validate([
            'system_id'   => 'nullable|uuid|exists:project_systems,id',
            'code'        => 'nullable|string|max:50',
            'name_ar'     => 'nullable|string|max:300',
            'name_en'     => 'required|string|max:300',
            'scope_type'  => 'nullable|string|in:general,supply,works,services',
            'budget_cost' => 'nullable|numeric|min:0',
            'planned_cost'=> 'nullable|numeric|min:0',
        ]);

        $package = $project->packages()->create([
            ...$validated,
            'created_by_user_id' => $request->user()->id,
        ]);

        $this->activityLogger->log('project_package.created', $package, [], $package->toArray(), $request->user());

        return back()->with('success', 'Package created successfully.');
    }

    public function update(Request $request, Project $project, ProjectPackage $package): RedirectResponse
    {
        $this->authorize('update', $package);

        $validated = $request->validate([
            'system_id'    => 'nullable|uuid|exists:project_systems,id',
            'code'         => 'nullable|string|max:50',
            'name_ar'      => 'nullable|string|max:300',
            'name_en'      => 'required|string|max:300',
            'scope_type'   => 'nullable|string|in:general,supply,works,services',
            'budget_cost'  => 'nullable|numeric|min:0',
            'planned_cost' => 'nullable|numeric|min:0',
            'status'       => 'nullable|string|in:draft,active,awarded,closed',
        ]);

        $package->update($validated);

        $this->activityLogger->log('project_package.updated', $package, [], $package->toArray(), $request->user());

        return back()->with('success', 'Package updated successfully.');
    }

    public function destroy(Request $request, Project $project, ProjectPackage $package): RedirectResponse
    {
        $this->authorize('delete', $package);

        $package->delete();

        $this->activityLogger->log('project_package.deleted', $package, $package->toArray(), [], $request->user());

        return back()->with('success', 'Package deleted successfully.');
    }
}
