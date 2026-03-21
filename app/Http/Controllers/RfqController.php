<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Application\Procurement\Services\CreateRfqFromPackageService;
use App\Application\Procurement\Services\SubmitRfqQuoteService;
use App\Models\ProcurementPackageAttachment;
use App\Models\ProcurementPackage;
use App\Models\Project;
use App\Models\Rfq;
use App\Models\RfqAward;
use App\Models\RfqDocument;
use App\Models\RfqQuote;
use App\Exceptions\BudgetExceededException;
use App\Exceptions\QuantityExceededException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use App\Models\SupplierQuote;
use App\Services\ActivityLogger;
use App\Services\BudgetConsumptionService;
use App\Services\Procurement\PackageReadinessService;
use App\Services\Procurement\RfqEventService;
use App\Services\Procurement\ContractService;
use App\Services\Procurement\RfqAwardService;
use App\Services\Procurement\RfqComparisonService;
use App\Services\Procurement\RfqEvaluationService;
use App\Services\Procurement\RfqReadinessService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Barryvdh\DomPDF\Facade\Pdf;
use App\Support\BrandingHelper;
use App\Support\TimelineBuilder;
use App\Support\DocumentRequirements;
use Illuminate\Validation\Rule;

class RfqController extends Controller
{
    private const PACKAGE_ATTACHMENT_MIME_TO_EXT = [
        'application/pdf'                                                                 => 'pdf',
        'application/msword'                                                              => 'doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'         => 'docx',
        'application/vnd.ms-excel'                                                         => 'xls',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'                => 'xlsx',
        'image/png'                                                                        => 'png',
        'image/jpeg'                                                                       => 'jpg',
        'image/jpg'                                                                        => 'jpg',
    ];
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
            ->withCount([
                'suppliers',
                'rfqQuotes as quotes_count' => fn ($q) => $q->whereIn('status', [RfqQuote::STATUS_SUBMITTED, RfqQuote::STATUS_REVISED]),
            ])
            ->orderByDesc('created_at');

        $metrics = [
            'total'  => (clone $baseQuery)->count(),
            'draft'  => (clone $baseQuery)->where('status', 'draft')->count(),
            'active' => (clone $baseQuery)->whereIn('status', ['internally_approved', 'issued', 'supplier_questions_open', 'responses_received', 'under_evaluation', 'recommended'])->count(),
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
            ->withCount([
                'suppliers',
                'rfqQuotes as quotes_count' => fn ($q) => $q->whereIn('status', [RfqQuote::STATUS_SUBMITTED, RfqQuote::STATUS_REVISED]),
            ])
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

    public function createFromPackage(Request $request, Project $project, ProcurementPackage $package): Response|RedirectResponse
    {
        $this->authorize('view', $package);
        if ($package->project_id !== $project->id) {
            abort(404);
        }

        $readiness = app(PackageReadinessService::class)->check($package);
        if (! $readiness['ready']) {
            return redirect()
                ->route('projects.procurement-packages.show', [$project->id, $package->id])
                ->with('error', __('rfqs.flash_package_not_ready'));
        }

        $package->load(['boqItems', 'attachments']);

        $suppliers = \App\Models\Supplier::query()
            ->where('status', 'approved')
            ->orderBy('legal_name_en')
            ->get(['id', 'legal_name_en', 'supplier_code', 'supplier_type', 'city', 'country']);

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
                'attachments'     => $package->attachments->map(function ($a) use ($project, $package): array {
                    $baseParams = [
                        'project'    => $project->id,
                        'package'    => $package->id,
                        'attachment' => $a->id,
                    ];
                    $downloadUrl = $a->external_url
                        ? null
                        : ($a->file_path ? route('projects.procurement-packages.attachments.download', $baseParams) : null);
                    $previewUrl = $a->external_url
                        ? $a->external_url
                        : ($a->file_path ? route('projects.procurement-packages.attachments.download', $baseParams + ['inline' => 1]) : null);
                    return [
                        'id'            => $a->id,
                        'title'         => $a->title,
                        'source_type'   => $a->source_type,
                        'document_type' => $a->document_type,
                        'external_url'  => $a->external_url,
                        'download_url'  => $downloadUrl,
                        'url'           => $previewUrl,
                    ];
                })->values()->all(),
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

        $readiness = app(PackageReadinessService::class)->check($package);
        if (! $readiness['ready']) {
            throw ValidationException::withMessages([
                'package' => [__('rfqs.flash_package_not_ready')],
            ]);
        }

        $validated = $request->validate([
            'title'                 => 'required|string|max:300',
            'submission_deadline'   => 'nullable|date',
            'currency'              => 'nullable|string|size:3',
            'supplier_ids'          => 'required|array|min:1',
            'supplier_ids.*'        => 'uuid|exists:suppliers,id',
            'on_vendor_list_ids'   => 'nullable|array',
            'on_vendor_list_ids.*' => 'uuid|exists:suppliers,id',
        ]);

        $supplierIds = $validated['supplier_ids'];
        $onVendorListIds = array_values(array_intersect(
            $validated['on_vendor_list_ids'] ?? [],
            $supplierIds
        ));

        $data = [
            'title'                 => $validated['title'],
            'submission_deadline'   => $validated['submission_deadline'] ?? null,
            'currency'              => $validated['currency'] ?? $package->currency ?? 'SAR',
            'supplier_ids'          => $supplierIds,
            'on_vendor_list_ids'    => $onVendorListIds,
            'created_by'            => $request->user()->id,
        ];

        $rfq = app(CreateRfqFromPackageService::class)->execute($package, $data);

        $this->activityLogger->log('rfq.created', $rfq, [], [], $request->user());

        return redirect()->route('rfqs.show', $rfq)
            ->with('success', __('rfqs.flash_rfq_created_from_package'));
    }

    public function comparison(Request $request, Rfq $rfq): Response
    {
        $this->authorize('view', $rfq);

        $rfq->loadMissing([
            'project:id,name,code',
            'procurementPackage:id,name,package_no',
            'suppliers.supplier:id,legal_name_en,supplier_code,supplier_type',
            'rfqQuotes' => fn ($q) => $q->whereIn('status', [RfqQuote::STATUS_SUBMITTED, RfqQuote::STATUS_REVISED])->with('items'),
            'clarifications',
            'recommendedSupplier:id,legal_name_en,supplier_code',
            'recommendedBy:id,name',
            'recommendationApprovedBy:id,name',
            'recommendationRejectedBy:id,name',
        ]);

        $supplierComparisons = $rfq->suppliers->map(function ($rfqSupplier) use ($rfq) {
            $supplier = $rfqSupplier->supplier;
            $latestQuote = $rfq->rfqQuotes->where('supplier_id', $supplier->id)->sortByDesc('submitted_at')->first();
            $quotedTotal = $latestQuote !== null
                ? (float) $latestQuote->items->sum('total_price')
                : null;
            $clarificationCount = $rfq->clarifications->where('supplier_id', $supplier->id)->count();

            return [
                'supplier_id'         => $supplier->id,
                'supplier_name'       => $supplier->legal_name_en ?? $supplier->supplier_code,
                'supplier_code'       => $supplier->supplier_code ?? '',
                'invitation_status'   => $rfqSupplier->status,
                'on_vendor_list'      => $rfqSupplier->on_vendor_list ?? null,
                'quote_submitted'     => $latestQuote !== null,
                'quote_status'       => $latestQuote?->status,
                'quoted_total'        => $quotedTotal,
                'quoted_items_count'  => $latestQuote !== null ? $latestQuote->items->count() : null,
                'clarification_count' => $clarificationCount,
                'is_recommended'      => $rfq->recommended_supplier_id === $supplier->id,
            ];
        })->values()->all();

        return Inertia::render('Rfqs/Comparison', [
            'rfq'                 => $rfq->only([
                'id', 'rfq_number', 'status', 'currency',
                'submission_deadline', 'recommendation_status',
                'recommendation_notes', 'recommended_supplier_id',
            ]),
            'project'             => $rfq->project ? $rfq->project->only(['id', 'name', 'code']) : null,
            'package'             => $rfq->procurementPackage ? $rfq->procurementPackage->only(['id', 'name', 'package_no']) : null,
            'supplierComparisons' => $supplierComparisons,
            'recommendedSupplier' => $rfq->recommendedSupplier ? $rfq->recommendedSupplier->only(['id', 'legal_name_en', 'supplier_code']) : null,
            'recommendedBy'       => $rfq->recommendedBy ? $rfq->recommendedBy->only(['id', 'name']) : null,
            'recommendedAt'       => $rfq->recommended_at?->format('d M Y H:i'),
            'recommendationApprovedByName' => $rfq->recommendationApprovedBy?->name,
            'recommendationApprovedAt'     => $rfq->recommendation_approved_at?->format('d M Y H:i'),
            'recommendationRejectedByName' => $rfq->recommendationRejectedBy?->name,
            'recommendationRejectedAt'     => $rfq->recommendation_rejected_at?->format('d M Y H:i'),
            'recommendationApprovalNotes' => $rfq->recommendation_approval_notes,
            'can'                 => [
                'recommend'           => $request->user()->can('update', $rfq),
                'approve_recommendation' => $request->user()->can('approveRecommendation', $rfq),
            ],
            'recommendationCanSubmit'  => $rfq->canSubmitRecommendationForApproval(),
            'recommendationCanApprove' => $rfq->canApproveRecommendation(),
            'recommendationCanReject'  => $rfq->canRejectRecommendation(),
        ]);
    }

    public function saveRecommendation(Request $request, Rfq $rfq): RedirectResponse
    {
        $this->authorize('update', $rfq);

        $validated = $request->validate([
            'recommended_supplier_id' => ['nullable', 'string', 'max:36'],
            'recommendation_notes'    => ['nullable', 'string', 'max:2000'],
            'recommendation_status'   => ['required', 'string', 'in:draft,submitted'],
        ]);

        $supplierId = $validated['recommended_supplier_id'] ?? null;
        if ($supplierId === '' || $supplierId === 'none') {
            $supplierId = null;
        } elseif ($supplierId !== null && ! \App\Models\Supplier::where('id', $supplierId)->exists()) {
            throw ValidationException::withMessages(['recommended_supplier_id' => [__('validation.exists', ['attribute' => 'supplier'])]]);
        }

        $rfq->update([
            'recommended_supplier_id' => $supplierId,
            'recommendation_notes'    => $validated['recommendation_notes'] ?? null,
            'recommendation_status'   => $validated['recommendation_status'],
            'recommended_by'          => $request->user()->id,
            'recommended_at'          => now(),
        ]);

        $this->activityLogger->log('rfq.recommendation_saved', $rfq, [], [], $request->user());

        return back()->with('success', __('rfqs.recommendation_saved'));
    }

    public function evaluateSupplier(Request $request, Rfq $rfq): RedirectResponse
    {
        $this->authorize('evaluateSupplier', $rfq);

        $validated = $request->validate([
            'supplier_id'       => 'required|uuid|exists:suppliers,id',
            'price_score'       => 'required|numeric|min:0',
            'technical_score'   => 'required|numeric|min:0',
            'commercial_score'  => 'required|numeric|min:0',
            'comments'          => 'nullable|string|max:2000',
        ]);

        $supplier = \App\Models\Supplier::findOrFail($validated['supplier_id']);

        app(RfqEvaluationService::class)->recordEvaluation(
            $rfq,
            $supplier,
            $request->user(),
            (float) $validated['price_score'],
            (float) $validated['technical_score'],
            (float) $validated['commercial_score'],
            $validated['comments'] ?? null
        );

        return back()->with('success', __('rfqs.flash_evaluation_recorded'));
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
            'rfqApprovedBy:id,name',
            'items' => fn ($q) => $q->orderBy('sort_order'),
            'suppliers.supplier:id,legal_name_en,supplier_code,supplier_type,city,country',
            'rfqQuotes' => fn ($q) => $q
                ->whereIn('status', [RfqQuote::STATUS_SUBMITTED, RfqQuote::STATUS_REVISED])
                ->with([
                    'supplier:id,legal_name_en,supplier_code',
                    'items.rfqItem:id,code,description_en,unit,qty',
                    'media',
                ]),
            'documents',
            'clarifications.supplier:id,legal_name_en',
            'clarifications.askedBy:id,name',
            'clarifications.answeredBy:id,name',
            'evaluations.supplier:id,legal_name_en,supplier_code',
            'evaluations.evaluator:id,name',
            'contract:id,rfq_id,contract_number,status,contract_value,currency,signed_at',
            'award.supplier:id,legal_name_en',
            'award.quote',
        ]);

        $comparisonService = app(RfqComparisonService::class);
        $comparisonData = Inertia::lazy(fn () => $comparisonService->buildShowComparisonData($rfq));

        $packageAttachments = $rfq->procurementPackage
            ? $rfq->procurementPackage->attachments->map(function ($a) use ($rfq): array {
                $baseParams = ['rfq' => $rfq->id, 'attachment' => $a->id];
                $downloadUrl = $a->external_url
                    ? null
                    : ($a->file_path ? route('rfqs.package-attachments.download', $baseParams) : null);
                $previewUrl = $a->external_url
                    ? $a->external_url
                    : ($a->file_path ? route('rfqs.package-attachments.download', $baseParams + ['inline' => 1]) : null);
                return [
                    'id' => $a->id,
                    'title' => $a->title,
                    'source_type' => $a->source_type,
                    'document_type' => $a->document_type,
                    'external_url' => $a->external_url,
                    'url' => $previewUrl,
                    'download_url' => $downloadUrl,
                ];
            })->values()->all()
            : [];

        $rfqDocumentsCollection = $rfq->documents;

        $rfqDocuments = $rfqDocumentsCollection->map(function (RfqDocument $doc): array {
            $downloadUrl = $doc->external_url
                ? ($doc->external_url ?? '')
                : ($doc->file_path ? route('rfqs.documents.download', ['rfq' => $doc->rfq_id, 'document' => $doc->id]) : '');

            $previewUrl = $doc->external_url
                ? $doc->external_url
                : ($doc->file_path ? route('rfqs.documents.download', ['rfq' => $doc->rfq_id, 'document' => $doc->id, 'inline' => 1]) : null);

            return [
                'id' => (string) $doc->id,
                'document_type' => $doc->document_type,
                'source_type' => $doc->source_type,
                'title' => $doc->title,
                'file_size_bytes' => $doc->file_size_bytes,
                'external_url' => $doc->external_url,
                'url' => $previewUrl,
                'download_url' => $downloadUrl,
                'version' => $doc->version ?? 1,
                'is_current' => $doc->is_current ?? true,
                'uploaded_at' => $doc->created_at?->format('d M Y'),
            ];
        })->values()->all();

        $rfqDocumentTypes = $rfqDocumentsCollection
            ->where('is_current', true)
            ->pluck('document_type')
            ->filter()
            ->unique()
            ->values()
            ->all();

        $rfqMissingDocuments = DocumentRequirements::missingForRfq($rfqDocumentTypes);

        $rfqQuotesPayload = $rfq->rfqQuotes->map(function (RfqQuote $quote) {
            $quoteItems = $quote->items->map(fn ($item) => [
                'id' => $item->id,
                'rfq_item_id' => $item->rfq_item_id,
                'unit_price' => (string) $item->unit_price,
                'total_price' => (string) $item->total_price,
                'currency' => $item->currency,
                'notes' => $item->notes,
                'rfq_item' => $item->rfqItem ? [
                    'id' => $item->rfqItem->id,
                    'code' => $item->rfqItem->code,
                    'description_en' => $item->rfqItem->description_en,
                    'unit' => $item->rfqItem->unit,
                    'qty' => (string) $item->rfqItem->qty,
                ] : null,
            ])->values()->all();

            return [
                'id' => $quote->id,
                'supplier_id' => $quote->supplier_id,
                'status' => $quote->status,
                'submitted_at' => $quote->submitted_at?->toIso8601String(),
                'total_amount' => (float) round((float) $quote->items->sum('total_price'), 2),
                'supplier' => $quote->supplier ? [
                    'id' => $quote->supplier->id,
                    'legal_name_en' => $quote->supplier->legal_name_en,
                    'supplier_code' => $quote->supplier->supplier_code,
                ] : null,
                'items' => $quoteItems,
                'attachments' => $quote->media->map(fn ($media) => [
                    'id' => $media->id,
                    'name' => $media->file_name,
                    'size_bytes' => $media->size,
                    'mime_type' => $media->mime_type,
                    'url' => route('media.show', $media->id),
                    'download_url' => route('media.download', $media->id),
                ])->values()->all(),
            ];
        })->values()->all();

        $clarificationsPayload = $rfq->clarifications->map(fn ($clarification) => [
            'id' => $clarification->id,
            'question' => $clarification->question,
            'answer' => $clarification->answer,
            'status' => $clarification->status ?: ($clarification->answer ? 'answered' : 'open'),
            'visibility' => $clarification->visibility,
            'created_at' => $clarification->created_at?->toIso8601String(),
            'answered_at' => $clarification->answered_at?->toIso8601String(),
            'supplier' => $clarification->supplier ? [
                'id' => $clarification->supplier->id,
                'legal_name_en' => $clarification->supplier->legal_name_en,
            ] : null,
            'asked_by_name' => $clarification->askedBy?->name,
            'answered_by_name' => $clarification->answeredBy?->name,
        ])->values()->all();

        $evaluationsPayload = $rfq->evaluations->map(fn ($evaluation) => [
            'id' => $evaluation->id,
            'supplier_id' => $evaluation->supplier_id,
            'evaluator_id' => $evaluation->evaluator_id,
            'price_score' => (float) $evaluation->price_score,
            'technical_score' => (float) $evaluation->technical_score,
            'commercial_score' => (float) $evaluation->commercial_score,
            'total_score' => (float) $evaluation->total_score,
            'comments' => $evaluation->comments,
            'created_at' => $evaluation->created_at?->toIso8601String(),
            'supplier' => $evaluation->supplier ? [
                'id' => $evaluation->supplier->id,
                'legal_name_en' => $evaluation->supplier->legal_name_en,
                'supplier_code' => $evaluation->supplier->supplier_code,
            ] : null,
            'evaluator' => $evaluation->evaluator ? [
                'id' => $evaluation->evaluator->id,
                'name' => $evaluation->evaluator->name,
            ] : null,
        ])->values()->all();

        $rfqPayload = array_merge($rfq->toArray(), [
            'documents' => $rfqDocuments,
            'rfq_quotes' => $rfqQuotesPayload,
            'clarifications' => $clarificationsPayload,
            'evaluations' => $evaluationsPayload,
            'contract' => $rfq->contract ? [
                'id' => $rfq->contract->id,
                'contract_number' => $rfq->contract->contract_number,
                'status' => $rfq->contract->status,
                'contract_value' => (float) $rfq->contract->contract_value,
                'currency' => $rfq->contract->currency,
                'signed_at' => $rfq->contract->signed_at?->toIso8601String(),
                'show_url' => route('contracts.show', $rfq->contract->id),
            ] : null,
        ]);

        return Inertia::render('Rfqs/Show', [
            'rfq'                 => $rfqPayload,
            'comparisonData'      => $comparisonData,
            'package_attachments' => $packageAttachments,
            'rfq_missing_documents' => $rfqMissingDocuments,
            'can'                 => [
                'issue'             => $request->user()->can('issue', $rfq),
                'mark_responses'    => $request->user()->can('markResponsesReceived', $rfq),
                'evaluate'          => $request->user()->can('evaluate', $rfq),
                'evaluate_supplier' => $request->user()->can('evaluateSupplier', $rfq),
                'award'             => $request->user()->can('award', $rfq),
                'create_contract'   => $request->user()->can('createContract', $rfq),
                'close'             => $request->user()->can('close', $rfq),
                'edit'              => $request->user()->can('update', $rfq),
                'delete'            => $request->user()->can('delete', $rfq),
                'approve_rfq'       => $request->user()->can('approve', $rfq),
                'manage_clarifications' => $request->user()->can('rfq.evaluate'),
            ],
            'approval_status'                          => $rfq->approval_status,
            'rfq_approved_by_name'                     => $rfq->rfqApprovedBy?->name ?? null,
            'rfq_approved_at_formatted'                => $rfq->rfq_approved_at?->format('d M Y H:i'),
            'rfq_submitted_for_approval_at_formatted'  => $rfq->rfq_submitted_for_approval_at?->format('d M Y H:i'),
            'rfq_approval_notes'                       => $rfq->rfq_approval_notes,
            'timeline'                                 => TimelineBuilder::forSubject(Rfq::class, (string) $rfq->id),
        ]);
    }

    public function print(Request $request, Rfq $rfq)
    {
        $this->authorize('view', $rfq);

        $this->loadRfqForDocument($rfq);
        $branding = BrandingHelper::get();

        return response()->view('pdf.rfq', compact('rfq', 'branding'));
    }

    public function pdf(Request $request, Rfq $rfq)
    {
        $this->authorize('view', $rfq);

        $this->loadRfqForDocument($rfq);
        $branding = BrandingHelper::get();

        $reference = $rfq->rfq_number ?? $rfq->id;

        $pdf = Pdf::loadView('pdf.rfq', compact('rfq', 'branding'))
            ->setPaper('a4', 'portrait');

        return $pdf->download("rfq-{$reference}.pdf");
    }

    private function loadRfqForDocument(Rfq $rfq): void
    {
        $rfq->loadMissing([
            'project:id,name,name_en,code',
            'purchaseRequest:id,pr_number,title_en',
            'procurementPackage:id,package_no,name,project_id',
            'createdBy:id,name',
            'issuedBy:id,name',
            'items' => fn ($q) => $q->orderBy('sort_order'),
            'suppliers.supplier:id,legal_name_en,supplier_code,supplier_type,city,country',
            'documents',
        ]);
    }

    public function downloadDocument(Request $request, Rfq $rfq, RfqDocument $document)
    {
        $this->authorize('view', $rfq);
        if ($document->rfq_id !== $rfq->id) {
            abort(404);
        }

        if ($document->external_url) {
            return redirect()->away($document->external_url);
        }

        if (! $document->file_path) {
            abort(404, 'Document file not found.');
        }

        $disk = 'local';

        if (! Storage::disk($disk)->exists($document->file_path)) {
            abort(404, 'Document file not found.');
        }

        $inline = $request->boolean('inline');

        $base = $document->title !== ''
            ? (string) preg_replace('/[^A-Za-z0-9._-]+/', '_', $document->title)
            : (pathinfo($document->file_path, PATHINFO_FILENAME) ?: 'document');

        $ext = pathinfo($document->file_path, PATHINFO_EXTENSION);
        if ($ext === '') {
            $ext = 'bin';
        }

        if (! str_ends_with(strtolower($base), '.' . strtolower($ext))) {
            $filename = $base . '.' . $ext;
        } else {
            $filename = $base;
        }

        if ($inline) {
            $mimeType = $document->mime_type ?: Storage::disk($disk)->mimeType($document->file_path);
            $stream = Storage::disk($disk)->readStream($document->file_path);
            if ($stream === null) {
                abort(404, 'Document file not found.');
            }

            return new StreamedResponse(function () use ($stream): void {
                if (is_resource($stream)) {
                    fpassthru($stream);
                    fclose($stream);
                }
            }, 200, [
                'Content-Type'        => $mimeType ?: 'application/octet-stream',
                'Content-Disposition' => 'inline; filename="' . addslashes($filename) . '"',
            ]);
        }

        return Storage::disk($disk)->download($document->file_path, $filename);
    }

    public function downloadPackageAttachment(Request $request, Rfq $rfq, ProcurementPackageAttachment $attachment): StreamedResponse|\Illuminate\Http\RedirectResponse
    {
        $this->authorize('view', $rfq);
        if ((string) $rfq->procurement_package_id !== (string) $attachment->package_id) {
            abort(404);
        }

        if ($attachment->external_url) {
            return redirect()->away($attachment->external_url);
        }

        if (! $attachment->file_path) {
            abort(404, 'Attachment file not found.');
        }

        $diskCandidates = array_unique([
            (string) config('filesystems.default', 'local'),
            'local',
        ]);

        $inline = $request->boolean('inline');

        foreach ($diskCandidates as $disk) {
            if (Storage::disk($disk)->exists($attachment->file_path)) {
                $filename = $this->packageAttachmentFilename($attachment, $disk);
                $mimeType = $attachment->mime_type ?: Storage::disk($disk)->mimeType($attachment->file_path);
                $disposition = $inline ? 'inline' : 'attachment';
                $dispositionHeader = $disposition . '; filename="' . addslashes($filename) . '"';

                if ($inline) {
                    $stream = Storage::disk($disk)->readStream($attachment->file_path);
                    if ($stream === null) {
                        continue;
                    }

                    return new StreamedResponse(function () use ($stream): void {
                        if (is_resource($stream)) {
                            fpassthru($stream);
                            fclose($stream);
                        }
                    }, 200, [
                        'Content-Type'        => $mimeType ?: 'application/octet-stream',
                        'Content-Disposition' => $dispositionHeader,
                    ]);
                }

                return Storage::disk($disk)->download($attachment->file_path, $filename);
            }
        }

        abort(404, 'Attachment file not found.');
    }

    private function packageAttachmentFilename(ProcurementPackageAttachment $attachment, string $disk): string
    {
        $base = $attachment->title !== ''
            ? (string) preg_replace('/[^A-Za-z0-9._-]+/', '_', $attachment->title)
            : (pathinfo($attachment->file_path, PATHINFO_FILENAME) ?: attachment);;
        $ext = null;
        if ($attachment->mime_type && isset(self::PACKAGE_ATTACHMENT_MIME_TO_EXT[$attachment->mime_type])) {
            $ext = self::PACKAGE_ATTACHMENT_MIME_TO_EXT[$attachment->mime_type];
        }
        if ($ext === null) {
            $storedExt = pathinfo($attachment->file_path, PATHINFO_EXTENSION);
            if ($storedExt !== '') {
                $ext = $storedExt;
            } else {
                $ext = 'bin';
            }
        }
        if (str_ends_with(strtolower($base), '.' . $ext)) {
            return $base;
        }

        return $base . '.' . $ext;
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
            $rules["items.{$id}.unit_price"] = 'required|numeric|min:0.01';
            $rules["items.{$id}.total_price"] = 'required|numeric|min:0.01';
            $rules["items.{$id}.notes"] = 'nullable|string|max:1000';
        }

        $validated = $request->validate($rules, [
            'items.*.unit_price.min' => __('rfqs.price_must_be_positive'),
            'items.*.total_price.min' => __('rfqs.price_must_be_positive'),
        ]);

        try {
            $result = app(SubmitRfqQuoteService::class)->execute($rfq, [
                'supplier_id' => $validated['supplier_id'],
                'items' => $validated['items'],
            ]);
        } catch (\RuntimeException $e) {
            return back()->withErrors(['supplier_id' => $e->getMessage()]);
        }

        $message = $result['was_update']
            ? __('rfqs.supplier_quote_updated')
            : __('rfqs.flash_quote_submitted_internal');

        return back()->with('success', $message);
    }

    public function markResponsesReceived(Request $request, Rfq $rfq): RedirectResponse
    {
        $this->authorize('markResponsesReceived', $rfq);

        if ($rfq->status === Rfq::STATUS_RESPONSES_RECEIVED) {
            return back()->with('success', __('rfqs.flash_responses_already_received'));
        }

        $rfq->changeStatus(Rfq::STATUS_RESPONSES_RECEIVED, $request->user());

        $this->activityLogger->log('rfq.responses_received', $rfq, [], [], $request->user());

        return back()->with('success', __('rfqs.flash_responses_received'));
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
                    "items.{$i}.boq_item_id" => __('rfqs.item_must_reference_boq_or_pr'),
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
            ->with('success', __('rfqs.flash_rfq_created'));
    }

    public function update(Request $request, Rfq $rfq): RedirectResponse
    {
        $this->authorize('update', $rfq);

        if ($rfq->status !== 'draft') {
            abort(403, __('rfqs.flash_rfq_edit_forbidden'));
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

        return back()->with('success', __('rfqs.flash_rfq_updated'));
    }

    public function issue(Request $request, Rfq $rfq): RedirectResponse
    {
        $this->authorize('issue', $rfq);

        if ($rfq->approval_status !== Rfq::APPROVAL_APPROVED) {
            return back()->withErrors([
                'approval' => __('rfqs.approval_required_before_issue'),
            ]);
        }

        $missingDocs = DocumentRequirements::missingForRfq(
            $rfq->documents()
                ->where('is_current', true)
                ->pluck('document_type')
                ->toArray()
        );

        if (! empty($missingDocs) && ! $request->boolean('force_issue')) {
            return back()->withErrors([
                'documents' => __('documents.missing_before_issue', [
                    'docs' => implode(', ', $missingDocs),
                ]),
            ]);
        }

        $readiness = app(RfqReadinessService::class)->check($rfq);
        if (! $readiness['ready']) {
            return back()->withErrors(['rfq' => __('rfqs.rfq_not_ready_to_issue')]);
        }

        $rfq->changeStatus(Rfq::STATUS_ISSUED, $request->user());
        $rfq->update([
            'issued_by' => $request->user()->id,
            'issued_at' => now(),
        ]);

        $this->activityLogger->log('rfq.issued', $rfq, [], [], $request->user());
        app(RfqEventService::class)->rfqIssued($rfq);

        return back()->with('success', __('rfqs.flash_rfq_issued'));
    }

    public function evaluate(Request $request, Rfq $rfq): RedirectResponse
    {
        $this->authorize('evaluate', $rfq);

        $rfq->changeStatus(Rfq::STATUS_UNDER_EVALUATION, $request->user());

        $this->activityLogger->log('rfq.evaluation_started', $rfq, [], [], $request->user());
        app(RfqEventService::class)->rfqMovedToEvaluation($rfq);

        return back()->with('success', __('rfqs.flash_evaluation_stage'));
    }

    /** Award from the “Award RFQ” modal — persists RfqAward via RfqAwardService (route `rfqs.award`). */
    public function awardSupplier(Request $request, Rfq $rfq): RedirectResponse
    {
        $this->authorize('award', $rfq);

        $validated = $request->validate([
            'supplier_id' => 'required|uuid|exists:suppliers,id',
            'amount'      => 'required|numeric|min:0.01',
            'currency'    => 'required|string|max:10',
            'reason'      => 'nullable|string|max:2000',
        ]);

        $supplier = \App\Models\Supplier::findOrFail($validated['supplier_id']);

        try {
            app(RfqAwardService::class)->awardSupplier(
                $rfq,
                $supplier,
                $request->user(),
                (float) $validated['amount'],
                $validated['currency'],
                $validated['reason'] ?? null
            );
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with('success', __('rfqs.flash_rfq_awarded'));
    }

    public function createContract(Request $request, Rfq $rfq): RedirectResponse
    {
        $this->authorize('createContract', $rfq);

        $award = $rfq->award;
        if (! $award) {
            return back()->with('error', __('rfqs.flash_contract_no_award'));
        }

        try {
            app(ContractService::class)->createFromAward($rfq, $award, $request->user());
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with('success', __('rfqs.flash_contract_created'));
    }

    /**
     * Legacy award path using {@see SupplierQuote} (supplier_quotes table).
     * Not registered in `routes/web.php` as of March 2026 — primary UI uses
     * {@see self::awardSupplier()} (route `rfqs.award`) and {@see self::awardFromComparison()}.
     *
     * @deprecated Retained for backward compatibility if external callers exist; do not wire new UI to this action.
     */
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
                $rfq = Rfq::where('id', $rfq->id)->lockForUpdate()->firstOrFail();
                if ($rfq->award()->exists()) {
                    throw new \RuntimeException('RFQ already awarded.');
                }

                $quote->load('items.rfqItem.prItem');
                $rfq->load('purchaseRequest');
                $this->budgetConsumption->addConsumptionFromRfqAward($rfq, $quote, $request->user());

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
            });
        } catch (BudgetExceededException $e) {
            return back()->with('error', $e->getMessage());
        } catch (QuantityExceededException $e) {
            return back()->with('error', $e->getMessage());
        } catch (ModelNotFoundException $e) {
            return back()->with('error', __('rfqs.flash_boq_allocation_error'));
        }

        $this->activityLogger->log('rfq.awarded', $rfq, [], [], $request->user());
        app(RfqEventService::class)->rfqAwarded($rfq);

        return back()->with('success', __('rfqs.flash_rfq_awarded'));
    }

    /** Award from comparison tab — persists RfqAward with `rfq_quote_id` (route `rfqs.award-from-comparison`). */
    public function awardFromComparison(Request $request, Rfq $rfq): RedirectResponse
    {
        $this->authorize('award', $rfq);

        $validated = $request->validate([
            'rfq_quote_id' => 'required|uuid|exists:rfq_quotes,id',
            'award_note'   => 'nullable|string|max:1000',
        ]);

        $quote = RfqQuote::where('id', $validated['rfq_quote_id'])
            ->where('rfq_id', $rfq->id)
            ->whereIn('status', [RfqQuote::STATUS_SUBMITTED, RfqQuote::STATUS_REVISED])
            ->with('items')
            ->firstOrFail();

        $awardedAmount = (float) $quote->items->sum('total_price');

        DB::transaction(function () use ($quote, $rfq, $request, $awardedAmount, $validated): void {
            $rfq = Rfq::where('id', $rfq->id)->lockForUpdate()->firstOrFail();
            if ($rfq->award()->exists()) {
                throw new \RuntimeException('RFQ already awarded.');
            }

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
        app(RfqEventService::class)->rfqAwarded($rfq);

        return back()->with('success', __('rfqs.flash_rfq_awarded'));
    }

    public function close(Request $request, Rfq $rfq): RedirectResponse
    {
        $this->authorize('close', $rfq);

        $rfq->update([
            'status'    => 'closed',
            'closed_at' => now(),
        ]);

        $this->activityLogger->log('rfq.closed', $rfq, [], [], $request->user());

        return back()->with('success', __('rfqs.flash_rfq_closed'));
    }

    public function transition(Request $request, Rfq $rfq): RedirectResponse
    {
        $this->authorize('view', $rfq);
        if (! $request->user()->can('rfq.evaluate')) {
            abort(403);
        }

        $data = $request->validate([
            'status' => ['required', 'string', Rule::in(Rfq::STATUSES)],
        ]);

        $newStatus = $data['status'];
        $blocked = [
            Rfq::STATUS_ISSUED,
            Rfq::STATUS_RESPONSES_RECEIVED,
            Rfq::STATUS_UNDER_EVALUATION,
            Rfq::STATUS_AWARDED,
            Rfq::STATUS_CLOSED,
        ];

        if (in_array($newStatus, $blocked, true)) {
            return back()->withErrors([
                'status' => __('rfqs.use_dedicated_action'),
            ]);
        }

        if (! $rfq->canTransitionTo($newStatus)) {
            return back()->withErrors([
                'status' => __('rfqs.invalid_transition'),
            ]);
        }

        if ($newStatus === $rfq->status) {
            return back()->with('success', __('rfqs.status_updated'));
        }

        $oldStatus = $rfq->status;

        $rfq->changeStatus($newStatus, $request->user());

        $this->activityLogger->log(
            'rfq.status_changed',
            $rfq,
            ['status' => $oldStatus],
            ['status' => $newStatus],
            $request->user()
        );

        return back()->with('success', __('rfqs.status_updated'));
    }

    public function destroy(Request $request, Rfq $rfq): RedirectResponse
    {
        $this->authorize('delete', $rfq);

        $rfq->delete();

        $this->activityLogger->log('rfq.deleted', $rfq, [], [], $request->user());

        return redirect()->route('rfqs.index')
            ->with('success', __('rfqs.flash_rfq_deleted'));
    }

    public function submitRfqForApproval(Request $request, Rfq $rfq): RedirectResponse
    {
        $this->authorize('update', $rfq);
        abort_unless($rfq->canSubmitRfqForApproval(), 422, __('rfqs.cannot_submit_for_approval'));

        $rfq->update([
            'approval_status'                 => Rfq::APPROVAL_SUBMITTED,
            'rfq_submitted_for_approval_at'   => now(),
        ]);

        $this->activityLogger->log('rfq.submitted_for_approval', $rfq, [], [], $request->user());

        return back()->with('success', __('rfqs.submitted_for_approval'));
    }

    public function approveRfq(Request $request, Rfq $rfq): RedirectResponse
    {
        $this->authorize('approve', $rfq);
        abort_unless($rfq->canApproveRfq(), 422, __('rfqs.cannot_submit_for_approval'));

        $rfq->update([
            'approval_status'      => Rfq::APPROVAL_APPROVED,
            'rfq_approved_by'      => $request->user()->id,
            'rfq_approved_at'     => now(),
            'rfq_approval_notes'  => $request->input('rfq_approval_notes'),
        ]);

        $this->activityLogger->log('rfq.approved', $rfq, [], [], $request->user());

        return back()->with('success', __('rfqs.rfq_approved'));
    }

    public function rejectRfq(Request $request, Rfq $rfq): RedirectResponse
    {
        $this->authorize('approve', $rfq);
        abort_unless($rfq->canRejectRfq(), 422, __('rfqs.cannot_submit_for_approval'));

        $validated = $request->validate([
            'rfq_approval_notes' => ['required', 'string', 'max:1000'],
        ]);

        $rfq->update([
            'approval_status'     => Rfq::APPROVAL_REJECTED,
            'rfq_approved_by'    => $request->user()->id,
            'rfq_approved_at'    => now(),
            'rfq_approval_notes' => $validated['rfq_approval_notes'],
        ]);

        $this->activityLogger->log('rfq.rejected', $rfq, [], [], $request->user());

        return back()->with('success', __('rfqs.rfq_rejected'));
    }

    public function submitRecommendationForApproval(Request $request, Rfq $rfq): RedirectResponse
    {
        $this->authorize('update', $rfq);
        abort_unless($rfq->canSubmitRecommendationForApproval(), 422, __('rfqs.cannot_submit_for_approval'));

        $this->activityLogger->log('rfq.recommendation_submitted_for_approval', $rfq, [], [], $request->user());

        return back()->with('success', __('rfqs.submitted_for_approval'));
    }

    public function approveRecommendation(Request $request, Rfq $rfq): RedirectResponse
    {
        $this->authorize('approveRecommendation', $rfq);
        abort_unless($rfq->canApproveRecommendation(), 422, __('rfqs.cannot_submit_for_approval'));

        $rfq->update([
            'recommendation_approved_by'   => $request->user()->id,
            'recommendation_approved_at'   => now(),
            'recommendation_approval_notes' => $request->input('recommendation_approval_notes'),
        ]);

        $this->activityLogger->log('rfq.recommendation_approved', $rfq, [], [], $request->user());

        return back()->with('success', __('rfqs.recommendation_approved'));
    }

    public function rejectRecommendation(Request $request, Rfq $rfq): RedirectResponse
    {
        $this->authorize('approveRecommendation', $rfq);
        abort_unless($rfq->canRejectRecommendation(), 422, __('rfqs.cannot_submit_for_approval'));

        $validated = $request->validate([
            'recommendation_approval_notes' => ['required', 'string', 'max:1000'],
        ]);

        $rfq->update([
            'recommendation_rejected_by'   => $request->user()->id,
            'recommendation_rejected_at'   => now(),
            'recommendation_approval_notes' => $validated['recommendation_approval_notes'],
        ]);

        $this->activityLogger->log('rfq.recommendation_rejected', $rfq, [], [], $request->user());

        return back()->with('success', __('rfqs.recommendation_rejected'));
    }
}
