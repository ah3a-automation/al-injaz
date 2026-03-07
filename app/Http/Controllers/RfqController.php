<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Application\Procurement\Services\CreateRfqFromPackageService;
use App\Application\Procurement\Services\SubmitRfqQuoteService;
use App\Models\ProcurementPackage;
use App\Models\Project;
use App\Models\Rfq;
use App\Models\RfqAward;
use App\Models\RfqQuote;
use App\Exceptions\BudgetExceededException;
use App\Exceptions\QuantityExceededException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use App\Models\SupplierQuote;
use App\Services\ActivityLogger;
use App\Services\BudgetConsumptionService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class RfqController extends Controller
{
    public function __construct(
        private readonly ActivityLogger $activityLogger,
        private readonly BudgetConsumptionService $budgetConsumption,
    ) {}

    public function create(Request $request): Response
    {
        $this->authorize('create', Rfq::class);

        $projects = Project::orderBy('name')->get(['id', 'name', 'name_en']);
        $purchaseRequests = \App\Models\PurchaseRequest::with('items')
            ->where('status', 'approved')
            ->orderByDesc('created_at')
            ->limit(100)
            ->get(['id', 'pr_number', 'title_en', 'project_id']);
        $boqItemsByProject = \App\Models\ProjectBoqItem::orderBy('code')
            ->get(['id', 'project_id', 'code', 'description_en'])
            ->groupBy('project_id')
            ->map(fn ($p) => $p->values()->all())
            ->all();

        return Inertia::render('Rfqs/Create', [
            'projects' => $projects,
            'purchaseRequests' => $purchaseRequests,
            'boqItemsByProject' => $boqItemsByProject,
        ]);
    }

    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Rfq::class);

        $baseQuery = Rfq::query()
            ->with([
                'project:id,name,name_en',
                'procurementPackage:id,package_no,name',
                'createdBy:id,name',
                'award',
            ])
            ->withCount(['suppliers', 'quotes'])
            ->orderByDesc('created_at');

        $metrics = [
            'total'  => (clone $baseQuery)->count(),
            'draft'  => (clone $baseQuery)->where('status', 'draft')->count(),
            'active' => (clone $baseQuery)->whereIn('status', ['issued', 'sent', 'supplier_submissions', 'responses_received', 'evaluation'])->count(),
            'closed' => (clone $baseQuery)->whereIn('status', ['closed', 'awarded'])->count(),
        ];

        $query = $baseQuery
            ->when($request->input('project_id'), fn ($q, $v) => $q->where('project_id', $v))
            ->when($request->input('status'), fn ($q, $v) => $q->where('status', $v))
            ->when($request->input('search'), fn ($q, $v) =>
                $q->where(fn ($q2) =>
                    $q2->where('rfq_number', 'ilike', '%' . $v . '%')
                       ->orWhere('title', 'ilike', '%' . $v . '%')
                )
            );

        $perPage = $request->integer('per_page', 25);
        $paginator = $query->cursorPaginate($perPage)->withQueryString();

        $rfqsPayload = [
            'data'        => $paginator->items(),
            'path'        => $paginator->path(),
            'per_page'    => $paginator->perPage(),
            'next_cursor' => $paginator->nextCursor()?->encode(),
            'prev_cursor' => $paginator->previousCursor()?->encode(),
        ];

        $payload = [
            'rfqs'     => $rfqsPayload,
            'metrics'  => $metrics,
            'projects' => Project::orderBy('name')->get(['id', 'name', 'name_en']),
            'filters'  => $request->only('project_id', 'status', 'search'),
            'can'      => [
                'create' => $request->user()->can('rfq.create'),
                'issue'  => $request->user()->can('rfq.issue'),
                'award'  => $request->user()->can('rfq.award'),
            ],
        ];
        if ($request->user()->can('rfq.create')) {
            $payload['purchaseRequests'] = \App\Models\PurchaseRequest::with('items')
                ->where('status', 'approved')
                ->orderByDesc('created_at')
                ->limit(100)
                ->get(['id', 'pr_number', 'title_en', 'project_id']);
        }
        return Inertia::render('Rfqs/Index', $payload);
    }

    public function projectIndex(Request $request, Project $project): Response
    {
        $this->authorize('view', $project);

        $query = Rfq::query()
            ->where('project_id', $project->id)
            ->with([
                'project:id,name,name_en',
                'procurementPackage:id,package_no,name',
                'createdBy:id,name',
            ])
            ->withCount(['suppliers', 'quotes'])
            ->orderByDesc('created_at')
            ->when($request->input('search'), fn ($q, $v) =>
                $q->where(fn ($q2) =>
                    $q2->where('rfq_number', 'ilike', '%' . $v . '%')
                       ->orWhere('title', 'ilike', '%' . $v . '%')
                )
            )
            ->when($request->input('status'), fn ($q, $v) => $q->where('status', $v));

        $perPage = $request->integer('per_page', 25);
        $paginator = $query->cursorPaginate($perPage)->withQueryString();

        $rfqsPayload = [
            'data'        => $paginator->items(),
            'path'        => $paginator->path(),
            'per_page'    => $paginator->perPage(),
            'next_cursor' => $paginator->nextCursor()?->encode(),
            'prev_cursor' => $paginator->previousCursor()?->encode(),
        ];

        return Inertia::render('Projects/Rfqs/Index', [
            'project'  => $project->only('id', 'name', 'name_en', 'name_ar', 'code'),
            'rfqs'     => $rfqsPayload,
            'filters'  => $request->only('search', 'status'),
            'can'      => [
                'create' => $request->user()->can('rfq.create'),
                'issue'  => $request->user()->can('rfq.issue'),
            ],
        ]);
    }

    public function createFromPackage(Request $request, Project $project, ProcurementPackage $package): Response
    {
        $this->authorize('view', $package);
        if ($package->project_id !== $project->id) {
            abort(404);
        }

        $package->load(['boqItems', 'attachments']);

        $suppliers = \App\Models\Supplier::query()
            ->where('status', 'approved')
            ->orderBy('legal_name_en')
            ->get(['id', 'legal_name_en', 'supplier_code']);

        return Inertia::render('Rfqs/CreateFromPackage', [
            'project'   => $project->only('id', 'name', 'name_en', 'name_ar', 'code'),
            'package'   => [
                'id'              => $package->id,
                'package_no'      => $package->package_no,
                'name'            => $package->name,
                'currency'        => $package->currency,
                'needed_by_date'  => $package->needed_by_date?->format('Y-m-d'),
                'boq_items'       => $package->boqItems->map(fn ($i) => [
                    'id'               => $i->id,
                    'code'             => $i->code,
                    'description_en'   => $i->description_en,
                    'description_ar'   => $i->description_ar,
                    'unit'             => $i->unit,
                    'qty'              => $i->qty,
                    'revenue_amount'   => $i->revenue_amount,
                    'planned_cost'     => $i->planned_cost,
                ])->values()->all(),
                'attachments'     => $package->attachments->map(fn ($a) => [
                    'id' => $a->id,
                    'title' => $a->title,
                    'source_type' => $a->source_type,
                    'document_type' => $a->document_type,
                    'external_url' => $a->external_url,
                ])->values()->all(),
            ],
            'suppliers' => $suppliers,
        ]);
    }

    public function storeFromPackage(Request $request, Project $project, ProcurementPackage $package): RedirectResponse
    {
        $this->authorize('view', $package);
        if ($package->project_id !== $project->id) {
            abort(404);
        }

        $validated = $request->validate([
            'title'                => 'required|string|max:300',
            'submission_deadline'  => 'nullable|date',
            'currency'             => 'nullable|string|size:3',
            'supplier_ids'         => 'required|array|min:1',
            'supplier_ids.*'       => 'uuid|exists:suppliers,id',
        ]);

        $data = [
            'title'                => $validated['title'],
            'submission_deadline'  => $validated['submission_deadline'] ?? null,
            'currency'             => $validated['currency'] ?? $package->currency ?? 'SAR',
            'supplier_ids'         => $validated['supplier_ids'],
            'created_by'           => $request->user()->id,
        ];

        $rfq = app(CreateRfqFromPackageService::class)->execute($package, $data);

        $this->activityLogger->log('rfq.created', $rfq, [], [], $request->user());

        return redirect()->route('rfqs.show', $rfq)
            ->with('success', 'RFQ created successfully. You can send it when ready.');
    }

    public function show(Request $request, Rfq $rfq): Response
    {
        $this->authorize('view', $rfq);

        $rfq->load([
            'project:id,name,name_en,code',
            'purchaseRequest:id,pr_number,title_en',
            'procurementPackage:id,package_no,name,project_id',
            'procurementPackage.attachments',
            'createdBy:id,name',
            'issuedBy:id,name',
            'items' => fn ($q) => $q->orderBy('sort_order'),
            'suppliers.supplier:id,legal_name_en,supplier_code,supplier_type,city,country',
            'suppliers.quotes',
            'rfqQuotes' => fn ($q) => $q->where('status', 'submitted')->with(['supplier:id,legal_name_en,supplier_code', 'items']),
            'documents',
            'clarifications.supplier:id,legal_name_en',
            'clarifications.askedBy:id,name',
            'clarifications.answeredBy:id,name',
            'award.supplier:id,legal_name_en',
            'award.quote',
        ]);

        $allQuoteItems = \App\Models\SupplierQuoteItem::whereHas('quote', fn ($q) =>
            $q->where('rfq_id', $rfq->id)->where('status', 'submitted')
        )
        ->with('quote:id,supplier_id,status,version_no')
        ->get()
        ->groupBy('rfq_item_id');

        $comparison = [];
        foreach ($rfq->items as $item) {
            $comparison[$item->id] = [];
            foreach ($allQuoteItems->get($item->id, collect()) as $qi) {
                if ($qi->quote) {
                    $comparison[$item->id][$qi->quote->supplier_id] = [
                        'unit_price'  => $qi->unit_price,
                        'total_price' => $qi->total_price,
                        'version_no'  => $qi->quote->version_no,
                    ];
                }
            }
        }

        $packageAttachments = $rfq->procurementPackage
            ? $rfq->procurementPackage->attachments->map(fn ($a) => [
                'id' => $a->id,
                'title' => $a->title,
                'source_type' => $a->source_type,
                'document_type' => $a->document_type,
                'external_url' => $a->external_url,
            ])->values()->all()
            : [];

        $submittedRfqQuotes = $rfq->rfqQuotes->where('status', 'submitted');
        $totalRfqItems = $rfq->items->count();
        $totalEstimatedCost = (float) $rfq->items->sum('estimated_cost');
        $quotesMatrix = [];
        $supplierTotals = [];
        foreach ($rfq->items as $item) {
            $quotesMatrix[$item->id] = [];
            foreach ($submittedRfqQuotes as $quote) {
                $quoteItem = $quote->items->firstWhere('rfq_item_id', $item->id);
                if ($quoteItem) {
                    $quotesMatrix[$item->id][$quote->supplier_id] = [
                        'unit_price'  => (string) $quoteItem->unit_price,
                        'total_price' => (string) $quoteItem->total_price,
                    ];
                    $supplierTotals[$quote->supplier_id] = ($supplierTotals[$quote->supplier_id] ?? 0) + (float) $quoteItem->total_price;
                }
            }
        }
        $supplierPricedCount = [];
        foreach ($submittedRfqQuotes as $quote) {
            $supplierPricedCount[$quote->supplier_id] = $quote->items->count();
        }
        $comparisonSuppliers = $submittedRfqQuotes->map(function ($q) use ($totalRfqItems, $supplierPricedCount, $supplierTotals, $totalEstimatedCost) {
            $pricedItems = $supplierPricedCount[$q->supplier_id] ?? 0;
            $completenessPct = $totalRfqItems > 0 ? round(($pricedItems / $totalRfqItems) * 100, 1) : 0.0;
            $supplierTotal = $supplierTotals[$q->supplier_id] ?? 0;
            $variancePct = $totalEstimatedCost > 0
                ? round((($supplierTotal - $totalEstimatedCost) / $totalEstimatedCost) * 100, 1)
                : null;

            return [
                'id'               => $q->supplier_id,
                'rfq_quote_id'     => $q->id,
                'legal_name_en'    => $q->supplier->legal_name_en ?? '',
                'supplier_code'    => $q->supplier->supplier_code ?? '',
                'total_rfq_items'  => $totalRfqItems,
                'priced_items'     => $pricedItems,
                'completeness_pct' => $completenessPct,
                'variance_pct'     => $variancePct,
            ];
        })->unique('id')->values()->all();
        $lowestSupplierId = $supplierTotals ? (string) array_search(min($supplierTotals), $supplierTotals, true) : null;
        $highestSupplierId = $supplierTotals ? (string) array_search(max($supplierTotals), $supplierTotals, true) : null;
        $eligibleForRecommendation = array_filter($comparisonSuppliers, fn ($s) => ($s['completeness_pct'] ?? 0) >= 100);
        $eligibleSupplierIds = array_column($eligibleForRecommendation, 'id');
        $minTotalAmongEligible = null;
        $recommendedSupplierIds = [];
        if ($eligibleSupplierIds !== []) {
            $totalsEligible = array_intersect_key($supplierTotals, array_flip($eligibleSupplierIds));
            $minTotalAmongEligible = $totalsEligible !== [] ? min($totalsEligible) : null;
            if ($minTotalAmongEligible !== null) {
                $recommendedSupplierIds = array_keys(array_filter($totalsEligible, fn ($t) => abs($t - $minTotalAmongEligible) < 0.01));
            }
        }
        $comparisonSummary = [
            'suppliers_invited'        => $rfq->suppliers->count(),
            'suppliers_responded'      => count($comparisonSuppliers),
            'lowest_total_supplier_id' => $lowestSupplierId,
            'highest_total_supplier_id'=> $highestSupplierId,
            'supplier_totals'          => $supplierTotals,
            'total_estimated_cost'     => $totalEstimatedCost,
            'total_rfq_items'          => $totalRfqItems,
            'recommended_supplier_ids' => $recommendedSupplierIds,
            'is_tie'                   => count($recommendedSupplierIds) > 1,
        ];

        return Inertia::render('Rfqs/Show', [
            'rfq'                   => $rfq,
            'comparison'            => $comparison,
            'comparison_quotes_matrix' => $quotesMatrix,
            'comparison_suppliers'  => $comparisonSuppliers,
            'comparison_summary'    => $comparisonSummary,
            'package_attachments'   => $packageAttachments,
            'can'                   => [
                'issue'               => $request->user()->can('issue', $rfq),
                'mark_responses'      => $request->user()->can('markResponsesReceived', $rfq),
                'evaluate'            => $request->user()->can('evaluate', $rfq),
                'award'               => $request->user()->can('award', $rfq),
                'close'               => $request->user()->can('close', $rfq),
                'edit'                => $request->user()->can('update', $rfq),
                'delete'              => $request->user()->can('delete', $rfq),
            ],
        ]);
    }

    public function storeQuote(Request $request, Rfq $rfq): RedirectResponse
    {
        $this->authorize('view', $rfq);

        $rfq->load('items');
        $itemIds = $rfq->items->pluck('id')->all();

        $rules = [
            'supplier_id' => 'required|uuid|exists:suppliers,id',
            'items'       => 'required|array',
        ];
        foreach ($itemIds as $id) {
            $rules["items.{$id}"] = 'required|array';
            $rules["items.{$id}.unit_price"] = 'required|numeric|min:0';
            $rules["items.{$id}.total_price"] = 'required|numeric|min:0';
            $rules["items.{$id}.notes"] = 'nullable|string|max:1000';
        }

        $validated = $request->validate($rules);

        try {
            app(SubmitRfqQuoteService::class)->execute($rfq, [
                'supplier_id' => $validated['supplier_id'],
                'items'       => $validated['items'],
            ]);
        } catch (\RuntimeException $e) {
            return back()->withErrors(['supplier_id' => $e->getMessage()]);
        }

        return back()->with('success', 'Quote submitted successfully.');
    }

    public function markResponsesReceived(Request $request, Rfq $rfq): RedirectResponse
    {
        $this->authorize('markResponsesReceived', $rfq);

        $rfq->update(['status' => 'supplier_submissions']);

        $this->activityLogger->log('rfq.responses_received', $rfq, [], [], $request->user());

        return back()->with('success', 'RFQ marked as responses received.');
    }

    public function store(Request $request): RedirectResponse
    {
        $this->authorize('create', Rfq::class);

        $validated = $request->validate([
            'project_id'              => 'nullable|uuid|exists:projects,id',
            'purchase_request_id'     => 'nullable|uuid|exists:purchase_requests,id',
            'title'                   => 'required|string|max:300',
            'description'             => 'nullable|string',
            'submission_deadline'     => 'nullable|date|after:today',
            'validity_period_days'    => 'nullable|integer|min:1|max:365',
            'currency'                => 'nullable|string|size:3',
            'require_acceptance'      => 'nullable|boolean',
            'items'                   => 'required|array|min:1',
            'items.*.description_en'  => 'required|string',
            'items.*.description_ar'  => 'nullable|string',
            'items.*.code'            => 'nullable|string|max:100',
            'items.*.unit'            => 'nullable|string|max:50',
            'items.*.qty'             => 'nullable|numeric|min:0',
            'items.*.estimated_cost'  => 'required|numeric|min:0',
            'items.*.boq_item_id'     => 'nullable|uuid|exists:project_boq_items,id',
            'items.*.pr_item_id'      => 'nullable|uuid|exists:purchase_request_items,id',
            'items.*.sort_order'      => 'nullable|integer',
        ]);

        foreach ($validated['items'] as $i => $item) {
            if (empty($item['boq_item_id']) && empty($item['pr_item_id'])) {
                return back()->withErrors([
                    "items.{$i}.boq_item_id" => 'Each item must reference a BOQ item or PR item.',
                ])->withInput();
            }
        }

        $rfq = DB::transaction(function () use ($validated, $request) {
            $rfq = Rfq::create([
                'project_id'           => $validated['project_id'] ?? null,
                'purchase_request_id'  => $validated['purchase_request_id'] ?? null,
                'title'                => $validated['title'],
                'description'          => $validated['description'] ?? null,
                'submission_deadline'  => $validated['submission_deadline'] ?? null,
                'validity_period_days' => $validated['validity_period_days'] ?? null,
                'currency'             => $validated['currency'] ?? 'SAR',
                'require_acceptance'   => $validated['require_acceptance'] ?? true,
                'rfq_number'           => Rfq::generateRfqNumber(),
                'created_by'           => $request->user()->id,
                'status'               => 'draft',
            ]);

            foreach ($validated['items'] as $index => $item) {
                $rfq->items()->create([
                    'description_en' => $item['description_en'],
                    'description_ar' => $item['description_ar'] ?? null,
                    'code'           => $item['code'] ?? null,
                    'unit'           => $item['unit'] ?? null,
                    'qty'            => $item['qty'] ?? null,
                    'estimated_cost' => $item['estimated_cost'],
                    'boq_item_id'    => $item['boq_item_id'] ?? null,
                    'pr_item_id'     => $item['pr_item_id'] ?? null,
                    'sort_order'     => $item['sort_order'] ?? $index,
                ]);
            }

            return $rfq;
        });

        $this->activityLogger->log('rfq.created', $rfq, [], [], $request->user());

        return redirect()->route('rfqs.show', $rfq)
            ->with('success', 'RFQ created successfully.');
    }

    public function update(Request $request, Rfq $rfq): RedirectResponse
    {
        $this->authorize('update', $rfq);

        if ($rfq->status !== 'draft') {
            abort(403, 'RFQ can only be edited in draft status.');
        }

        $validated = $request->validate([
            'title'                => 'required|string|max:300',
            'description'          => 'nullable|string',
            'submission_deadline'  => 'nullable|date',
            'validity_period_days' => 'nullable|integer|min:1|max:365',
            'currency'             => 'nullable|string|size:3',
            'require_acceptance'   => 'nullable|boolean',
            'addendum_note'        => 'nullable|string',
        ]);

        $rfq->update($validated);

        $this->activityLogger->log('rfq.updated', $rfq, [], [], $request->user());

        return back()->with('success', 'RFQ updated successfully.');
    }

    public function issue(Request $request, Rfq $rfq): RedirectResponse
    {
        $this->authorize('issue', $rfq);

        if ($rfq->suppliers()->count() === 0) {
            return back()->withErrors(['suppliers' => 'At least one supplier must be invited before issuing.']);
        }

        if ($rfq->items()->count() === 0) {
            return back()->withErrors(['items' => 'RFQ must have at least one item before issuing.']);
        }

        $rfq->update([
            'status'    => 'issued',
            'issued_by' => $request->user()->id,
            'issued_at' => now(),
        ]);

        $this->activityLogger->log('rfq.issued', $rfq, [], [], $request->user());

        return back()->with('success', 'RFQ issued successfully. Suppliers will be notified.');
    }

    public function evaluate(Request $request, Rfq $rfq): RedirectResponse
    {
        $this->authorize('evaluate', $rfq);

        $rfq->update(['status' => 'evaluation']);

        $this->activityLogger->log('rfq.evaluation_started', $rfq, [], [], $request->user());

        return back()->with('success', 'RFQ moved to evaluation stage.');
    }

    public function award(Request $request, Rfq $rfq): RedirectResponse
    {
        $this->authorize('award', $rfq);

        $validated = $request->validate([
            'supplier_id'    => 'required|uuid|exists:suppliers,id',
            'quote_id'       => 'required|uuid|exists:supplier_quotes,id',
            'awarded_amount' => 'required|numeric|min:0.01',
            'award_note'     => 'nullable|string|max:1000',
        ]);

        $quote = SupplierQuote::where('id', $validated['quote_id'])
            ->where('rfq_id', $rfq->id)
            ->where('supplier_id', $validated['supplier_id'])
            ->where('status', 'submitted')
            ->firstOrFail();

        try {
            DB::transaction(function () use ($validated, $rfq, $request, $quote) {
                RfqAward::create([
                    'rfq_id'         => $rfq->id,
                    'supplier_id'    => $validated['supplier_id'],
                    'quote_id'       => $quote->id,
                    'awarded_amount' => $validated['awarded_amount'],
                    'currency'       => $rfq->currency,
                    'award_note'     => $validated['award_note'] ?? null,
                    'awarded_by'     => $request->user()->id,
                ]);

                $rfq->update(['status' => 'awarded']);

                $quote->load('items.rfqItem.prItem');
                $rfq->load('purchaseRequest');
                $this->budgetConsumption->addConsumptionFromRfqAward($rfq, $quote, $request->user());
            });
        } catch (BudgetExceededException $e) {
            return back()->with('error', $e->getMessage());
        } catch (QuantityExceededException $e) {
            return back()->with('error', $e->getMessage());
        } catch (ModelNotFoundException $e) {
            return back()->with('error', 'BOQ item not allocated to package. Ensure package has the BOQ item in its allocation.');
        }

        $this->activityLogger->log('rfq.awarded', $rfq, [], [], $request->user());

        return back()->with('success', 'RFQ awarded successfully.');
    }

    public function awardFromComparison(Request $request, Rfq $rfq): RedirectResponse
    {
        $this->authorize('award', $rfq);

        $validated = $request->validate([
            'rfq_quote_id' => 'required|uuid|exists:rfq_quotes,id',
            'award_note'   => 'nullable|string|max:1000',
        ]);

        $quote = RfqQuote::where('id', $validated['rfq_quote_id'])
            ->where('rfq_id', $rfq->id)
            ->where('status', 'submitted')
            ->with('items')
            ->firstOrFail();

        $awardedAmount = (float) $quote->items->sum('total_price');

        DB::transaction(function () use ($quote, $rfq, $request, $awardedAmount, $validated): void {
            RfqAward::create([
                'rfq_id'         => $rfq->id,
                'supplier_id'    => $quote->supplier_id,
                'quote_id'       => null,
                'rfq_quote_id'   => $quote->id,
                'awarded_amount' => $awardedAmount,
                'currency'       => $rfq->currency,
                'award_note'     => $validated['award_note'] ?? null,
                'awarded_by'     => $request->user()->id,
            ]);
            $rfq->update(['status' => 'awarded']);
        });

        $this->activityLogger->log('rfq.awarded', $rfq, [], [], $request->user());

        return back()->with('success', 'RFQ awarded successfully.');
    }

    public function close(Request $request, Rfq $rfq): RedirectResponse
    {
        $this->authorize('close', $rfq);

        $rfq->update([
            'status'    => 'closed',
            'closed_at' => now(),
        ]);

        $this->activityLogger->log('rfq.closed', $rfq, [], [], $request->user());

        return back()->with('success', 'RFQ closed.');
    }

    public function destroy(Request $request, Rfq $rfq): RedirectResponse
    {
        $this->authorize('delete', $rfq);

        $rfq->delete();

        $this->activityLogger->log('rfq.deleted', $rfq, [], [], $request->user());

        return redirect()->route('rfqs.index')
            ->with('success', 'RFQ deleted.');
    }
}
