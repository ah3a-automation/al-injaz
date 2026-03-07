<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Exceptions\BudgetExceededException;
use App\Exceptions\QuantityExceededException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use App\Models\Project;
use App\Models\PurchaseRequest;
use App\Services\ActivityLogger;
use App\Services\BudgetConsumptionService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class PurchaseRequestController extends Controller
{
    public function __construct(
        private readonly ActivityLogger $activityLogger,
        private readonly BudgetConsumptionService $budgetConsumption,
    ) {}

    public function create(Request $request): Response
    {
        $this->authorize('create', PurchaseRequest::class);

        $projects = Project::orderBy('name')->get(['id', 'name', 'name_en']);
        $packages = \App\Models\ProjectPackage::orderBy('name_en')
            ->get(['id', 'project_id', 'name_en', 'code'])
            ->groupBy('project_id')
            ->map(fn ($p) => $p->values()->all())
            ->all();
        $boqItemsByProject = \App\Models\ProjectBoqItem::orderBy('code')
            ->get(['id', 'project_id', 'code', 'description_en'])
            ->groupBy('project_id')
            ->map(fn ($p) => $p->values()->all())
            ->all();

        return Inertia::render('PurchaseRequests/Create', [
            'projects' => $projects,
            'packagesByProject' => $packages,
            'boqItemsByProject' => $boqItemsByProject,
        ]);
    }

    public function index(Request $request): Response
    {
        $this->authorize('viewAny', PurchaseRequest::class);

        $prs = PurchaseRequest::with([
            'project:id,name,name_en',
            'requestedBy:id,name',
            'approvedBy:id,name',
        ])
        ->when($request->input('project_id'), fn ($q, $v) => $q->where('project_id', $v))
        ->when($request->input('status'),     fn ($q, $v) => $q->where('status', $v))
        ->when($request->input('priority'),   fn ($q, $v) => $q->where('priority', $v))
        ->when($request->input('search'),     fn ($q, $v) =>
            $q->where(fn ($q2) =>
                $q2->where('pr_number', 'ilike', "%{$v}%")
                   ->orWhere('title_en', 'ilike', "%{$v}%")
            )
        )
        ->orderByDesc('created_at')
        ->paginate($request->integer('per_page', 20))
        ->withQueryString();

        return Inertia::render('PurchaseRequests/Index', [
            'purchaseRequests' => $prs,
            'projects'         => Project::orderBy('name')->get(['id', 'name', 'name_en']),
            'filters'          => $request->only('project_id', 'status', 'priority', 'search'),
            'can'              => [
                'create'  => $request->user()->can('pr.create'),
                'approve' => $request->user()->can('pr.approve'),
                'convert' => $request->user()->can('pr.convert_to_rfq'),
            ],
        ]);
    }

    public function show(Request $request, PurchaseRequest $purchaseRequest): Response
    {
        $this->authorize('view', $purchaseRequest);

        $purchaseRequest->load([
            'project:id,name,name_en',
            'package:id,name_en,code',
            'requestedBy:id,name',
            'reviewedBy:id,name',
            'approvedBy:id,name',
            'items.boqItem:id,code,description_en',
            'items.package:id,name_en,code',
        ]);

        $packages = $purchaseRequest->project_id
            ? \App\Models\ProjectPackage::where('project_id', $purchaseRequest->project_id)
                ->get(['id', 'name_en', 'code'])
            : collect();

        return Inertia::render('PurchaseRequests/Show', [
            'pr'  => $purchaseRequest,
            'packages' => $packages,
            'can' => [
                'submit'  => $request->user()->can('submit', $purchaseRequest),
                'approve' => $request->user()->can('approve', $purchaseRequest),
                'reject'  => $request->user()->can('reject', $purchaseRequest),
                'convert' => $request->user()->can('convertToRfq', $purchaseRequest),
                'edit'    => $request->user()->can('update', $purchaseRequest),
                'delete'  => $request->user()->can('delete', $purchaseRequest),
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->authorize('create', PurchaseRequest::class);

        $validated = $request->validate([
            'project_id'             => 'required|uuid|exists:projects,id',
            'package_id'             => 'nullable|uuid|exists:project_packages,id',
            'title_en'               => 'required|string|max:300',
            'title_ar'               => 'nullable|string|max:300',
            'description'            => 'nullable|string',
            'priority'               => 'nullable|string|in:low,normal,high,urgent',
            'needed_by_date'         => 'nullable|date',
            'items'                  => 'required|array|min:1',
            'items.*.description_en' => 'required|string',
            'items.*.description_ar' => 'nullable|string',
            'items.*.unit'           => 'nullable|string|max:50',
            'items.*.qty'            => 'nullable|numeric|min:0',
            'items.*.estimated_cost' => 'required|numeric|min:0',
            'items.*.boq_item_id'    => 'nullable|uuid|exists:project_boq_items,id',
            'items.*.package_id'     => 'nullable|uuid|exists:project_packages,id',
            'items.*.notes'          => 'nullable|string',
        ]);

        $pr = DB::transaction(function () use ($validated, $request) {
            $pr = PurchaseRequest::create([
                'project_id'     => $validated['project_id'],
                'package_id'     => $validated['package_id'] ?? null,
                'title_en'       => $validated['title_en'],
                'title_ar'       => $validated['title_ar'] ?? null,
                'description'    => $validated['description'] ?? null,
                'priority'       => $validated['priority'] ?? 'normal',
                'needed_by_date' => $validated['needed_by_date'] ?? null,
                'pr_number'      => PurchaseRequest::generatePrNumber(),
                'requested_by'   => $request->user()->id,
                'status'         => 'draft',
            ]);

            foreach ($validated['items'] as $item) {
                $pr->items()->create([
                    'description_en' => $item['description_en'],
                    'description_ar' => $item['description_ar'] ?? null,
                    'unit'           => $item['unit'] ?? null,
                    'qty'            => $item['qty'] ?? null,
                    'estimated_cost' => $item['estimated_cost'],
                    'boq_item_id'    => $item['boq_item_id'] ?? null,
                    'package_id'     => $item['package_id'] ?? null,
                    'notes'          => $item['notes'] ?? null,
                ]);
            }

            return $pr;
        });

        $this->activityLogger->log('purchase_request.created', $pr, [], $pr->toArray(), $request->user());

        return redirect()->route('purchase-requests.show', $pr)
            ->with('success', 'Purchase request created successfully.');
    }

    public function update(Request $request, PurchaseRequest $purchaseRequest): RedirectResponse
    {
        $this->authorize('update', $purchaseRequest);

        $validated = $request->validate([
            'title_en'       => 'required|string|max:300',
            'title_ar'       => 'nullable|string|max:300',
            'description'    => 'nullable|string',
            'priority'       => 'nullable|string|in:low,normal,high,urgent',
            'needed_by_date' => 'nullable|date',
            'package_id'     => 'nullable|uuid|exists:project_packages,id',
        ]);

        $purchaseRequest->update($validated);

        $this->activityLogger->log('purchase_request.updated', $purchaseRequest, [], $purchaseRequest->toArray(), $request->user());

        return back()->with('success', 'Purchase request updated.');
    }

    public function submit(Request $request, PurchaseRequest $purchaseRequest): RedirectResponse
    {
        $this->authorize('submit', $purchaseRequest);

        $purchaseRequest->update(['status' => 'submitted']);

        $this->activityLogger->log('purchase_request.submitted', $purchaseRequest, [], $purchaseRequest->toArray(), $request->user());

        return back()->with('success', 'Purchase request submitted for review.');
    }

    public function approve(Request $request, PurchaseRequest $purchaseRequest): RedirectResponse
    {
        $this->authorize('approve', $purchaseRequest);

        try {
            DB::transaction(function () use ($request, $purchaseRequest) {
                $purchaseRequest->update([
                    'status'      => 'approved',
                    'approved_by' => $request->user()->id,
                    'approved_at' => now(),
                ]);
                $purchaseRequest->load('items');
                $this->budgetConsumption->addConsumptionFromPurchaseRequest($purchaseRequest, $request->user());
            });
        } catch (BudgetExceededException $e) {
            return back()->with('error', $e->getMessage());
        } catch (QuantityExceededException $e) {
            return back()->with('error', $e->getMessage());
        } catch (ModelNotFoundException $e) {
            return back()->with('error', 'BOQ item not allocated to package. Ensure package has the BOQ item in its allocation.');
        }

        $this->activityLogger->log('purchase_request.approved', $purchaseRequest, [], $purchaseRequest->toArray(), $request->user());

        return back()->with('success', 'Purchase request approved.');
    }

    public function reject(Request $request, PurchaseRequest $purchaseRequest): RedirectResponse
    {
        $this->authorize('reject', $purchaseRequest);

        $validated = $request->validate([
            'rejected_reason' => 'required|string|max:1000',
        ]);

        $purchaseRequest->update([
            'status'          => 'rejected',
            'rejected_reason' => $validated['rejected_reason'],
        ]);

        $this->activityLogger->log('purchase_request.rejected', $purchaseRequest, [], $purchaseRequest->toArray(), $request->user());

        return back()->with('success', 'Purchase request rejected.');
    }

    public function destroy(Request $request, PurchaseRequest $purchaseRequest): RedirectResponse
    {
        $this->authorize('delete', $purchaseRequest);

        $payload = $purchaseRequest->toArray();
        $purchaseRequest->delete();

        $this->activityLogger->log('purchase_request.deleted', $purchaseRequest, $payload, [], $request->user());

        return redirect()->route('purchase-requests.index')
            ->with('success', 'Purchase request deleted.');
    }
}
