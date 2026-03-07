<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Application\Procurement\Queries\BoqItemsForPackageCreateQuery;
use App\Models\ProcurementPackage;
use App\Models\Project;
use App\Models\ProjectBoqItem;
use App\Services\ActivityLogger;
use App\Services\ProcurementNumberingService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ProcurementPackageController extends Controller
{
    public function __construct(
        private readonly ActivityLogger $activityLogger,
        private readonly ProcurementNumberingService $numberingService,
        private readonly BoqItemsForPackageCreateQuery $boqItemsQuery,
    ) {}

    public function index(Request $request, Project $project): Response
    {
        $this->authorize('viewAny', [ProcurementPackage::class, $project]);

        $packages = $project->procurementPackages()
            ->withCount('boqItems')
            ->with('createdByUser:id,name')
            ->orderBy('created_at', 'desc')
            ->get();

        return Inertia::render('Projects/ProcurementPackages/Index', [
            'project'  => $project->only('id', 'name', 'name_en', 'name_ar', 'code'),
            'packages' => $packages,
        ]);
    }

    public function create(Request $request, Project $project): Response
    {
        $this->authorize('create', [ProcurementPackage::class, $project]);

        $search = $request->query('search');
        $unit = $request->query('unit');
        $leadType = $request->query('lead_type');
        $unusedOnly = $request->boolean('unused_only');
        $quickFilter = $request->query('quick_filter');
        if ($quickFilter !== null && $quickFilter !== '' && ! in_array($quickFilter, BoqItemsForPackageCreateQuery::QUICK_FILTER_VALUES, true)) {
            $quickFilter = null;
        }
        $cursor = $request->query('cursor');

        $boqVersion = $project->boqVersions()->where('status', 'active')->latest()->first();
        $units = $boqVersion
            ? $boqVersion->items()->distinct()->pluck('unit')->filter()->values()
            : collect();

        $cacheKey = sprintf(
            'boq-selector:%s:%s:%s:%s:%s:%s:%s:%s',
            $project->id,
            $boqVersion?->id ?? 'none',
            (string) $search,
            (string) $unit,
            (string) $leadType,
            $unusedOnly ? '1' : '0',
            (string) $quickFilter,
            (string) $cursor,
        );

        $boqItems = Cache::remember($cacheKey, 30, function () use ($project, $search, $unit, $leadType, $unusedOnly, $quickFilter, $cursor): \Illuminate\Contracts\Pagination\CursorPaginator {
            return $this->boqItemsQuery->executeCursorPaginated(
                $project,
                $search,
                $unit,
                $leadType,
                $unusedOnly,
                $quickFilter,
                $cursor,
                BoqItemsForPackageCreateQuery::PER_PAGE,
            );
        });

        $boqItems = $boqItems->through(function ($item): array {
            return $item->only([
                'id', 'sort_order', 'code', 'description_en', 'unit', 'qty',
                'revenue_amount', 'planned_cost', 'lead_type',
                'package_usage_count', 'request_usage_count', 'actual_cost_sum',
            ]);
        });

        return Inertia::render('Projects/ProcurementPackages/Create', [
            'project'   => $project->only('id', 'name', 'name_en', 'name_ar', 'code'),
            'boqItems'  => $boqItems,
            'units'     => $units,
            'filters'   => [
                'search'       => $search,
                'unit'         => $unit,
                'lead_type'    => $leadType,
                'unused_only'  => $unusedOnly,
                'quick_filter' => $quickFilter,
            ],
        ]);
    }

    public function store(Request $request, Project $project): RedirectResponse
    {
        $this->authorize('create', [ProcurementPackage::class, $project]);

        $validated = $request->validate([
            'name'            => 'required|string|max:255',
            'description'     => 'nullable|string',
            'currency'        => 'required|string|size:3',
            'needed_by_date'  => 'nullable|date',
            'boq_item_ids'    => 'required|array',
            'boq_item_ids.*'  => 'uuid|exists:project_boq_items,id',
            'attachments'     => 'nullable|array',
            'attachments.*.title' => 'required_with:attachments.*|string|max:200',
            'attachments.*.document_type' => 'nullable|string|in:specifications,drawings,boq,other',
            'attachments.*.source_type' => 'required_with:attachments.*|string|in:upload,google_drive,dropbox,onedrive,wetransfer,other_link',
            'attachments.*.external_url' => 'nullable|string|max:500',
            'attachments.*.external_provider' => 'nullable|string|max:30',
            'attachments.*.file' => 'nullable|file|mimes:pdf,doc,docx,xls,xlsx,png,jpg,jpeg|max:10240',
        ]);

        $package = DB::transaction(function () use ($project, $validated, $request): ProcurementPackage {
            $packageNo = $this->numberingService->nextPackageNo($project);

            $itemIds = array_unique($validated['boq_item_ids']);
            $items = ProjectBoqItem::where('project_id', $project->id)->whereIn('id', $itemIds)->get();
            $estimatedRevenue = $items->sum('revenue_amount');
            $estimatedCost = $items->sum('planned_cost');

            $package = $project->procurementPackages()->create([
                'package_no'         => $packageNo,
                'name'               => $validated['name'],
                'description'        => $validated['description'] ?? null,
                'currency'           => $validated['currency'],
                'needed_by_date'     => isset($validated['needed_by_date']) ? $validated['needed_by_date'] : null,
                'estimated_revenue'  => $estimatedRevenue,
                'estimated_cost'     => $estimatedCost,
                'actual_cost'        => 0,
                'status'            => ProcurementPackage::STATUS_DRAFT,
                'created_by'         => $request->user()->id,
            ]);

            $package->boqItems()->attach($items->pluck('id')->all());

            if (! empty($validated['attachments'])) {
                foreach ($validated['attachments'] as $att) {
                    $filePath = null;
                    if (isset($att['file']) && $att['file'] instanceof \Illuminate\Http\UploadedFile) {
                        $file = $att['file'];
                        $path = $file->store('procurement_attachments/' . $package->id, ['disk' => config('filesystems.default')]);
                        $filePath = $path;
                    }
                    $package->attachments()->create([
                        'document_type'      => $att['document_type'] ?? null,
                        'source_type'        => $att['source_type'] ?? 'other_link',
                        'title'              => $att['title'],
                        'file_path'          => $filePath,
                        'external_url'       => $att['external_url'] ?? null,
                        'external_provider'  => $att['external_provider'] ?? null,
                        'uploaded_by'        => $request->user()->id,
                    ]);
                }
            }

            return $package->fresh(['project', 'boqItems', 'attachments']);
        });

        $this->activityLogger->log('procurement_package.created', $package, [], $package->toArray(), $request->user());

        return redirect()
            ->route('projects.procurement-packages.show', [$project->id, $package->id])
            ->with('success', 'Procurement package created successfully.');
    }

    public function show(Request $request, Project $project, ProcurementPackage $package): Response
    {
        $this->authorize('view', $package);
        if ($package->project_id !== $project->id) {
            abort(404);
        }

        $package->load([
            'project:id,name,name_en,name_ar,code',
            'boqItems',
            'requests',
            'attachments',
            'createdByUser:id,name',
        ]);

        return Inertia::render('Projects/ProcurementPackages/Show', [
            'project'  => $project->only('id', 'name', 'name_en', 'name_ar', 'code'),
            'package'  => $package,
        ]);
    }

    public function storeAttachment(Request $request, Project $project, ProcurementPackage $package): RedirectResponse
    {
        $this->authorize('view', $package);
        if ($package->project_id !== $project->id) {
            abort(404);
        }

        $validated = $request->validate([
            'title'              => 'required|string|max:200',
            'document_type'     => 'nullable|string|in:specifications,drawings,boq,other',
            'source_type'       => 'required|string|in:upload,google_drive,dropbox,onedrive,wetransfer,other_link',
            'external_url'      => 'nullable|string|max:500',
            'external_provider' => 'nullable|string|max:30',
            'file'              => 'nullable|file|mimes:pdf,doc,docx,xls,xlsx,png,jpg,jpeg|max:10240',
        ]);

        $filePath = null;
        if ($request->hasFile('file') && $request->file('file')->isValid()) {
            $filePath = $request->file('file')->store(
                'procurement_attachments/' . $package->id,
                ['disk' => config('filesystems.default')]
            );
        }

        $package->attachments()->create([
            'document_type'     => $validated['document_type'] ?? null,
            'source_type'       => $validated['source_type'],
            'title'             => $validated['title'],
            'file_path'         => $filePath,
            'external_url'      => $validated['external_url'] ?? null,
            'external_provider' => $validated['external_provider'] ?? null,
            'uploaded_by'       => $request->user()->id,
        ]);

        return back()->with('success', 'Attachment added.');
    }
}
