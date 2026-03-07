<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Inertia\Inertia;
use Inertia\Response;

class ProjectBoqController extends Controller
{
    public function show(Request $request, Project $project): Response
    {
        $this->authorize('update', $project);

        $boqVersion = $project->boqVersions()
            ->where('status', 'active')
            ->latest()
            ->first();

        $items = $boqVersion
            ? $boqVersion->items()->orderBy('sort_order')->paginate(50)
            : new LengthAwarePaginator([], 0, 50);

        return Inertia::render('Projects/Boq/Show', [
            'project'     => $project->only('id', 'name', 'name_en', 'name_ar', 'code'),
            'boqVersion'  => $boqVersion ? $boqVersion->only('id', 'version_no', 'label', 'status', 'item_count', 'total_revenue', 'total_planned_cost') : null,
            'items'       => $items,
        ]);
    }
}
