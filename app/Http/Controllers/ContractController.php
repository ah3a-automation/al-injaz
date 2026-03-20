<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Contract;
use App\Models\ContractIssuePackage;
use App\Services\ActivityLogger;
use App\Services\Contracts\ContractSignaturePackageService;
use App\Services\Procurement\ContractLifecycleService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use App\Support\TimelineBuilder;

class ContractController extends Controller
{
    public function __construct(
        private readonly ContractSignaturePackageService $signaturePackageService,
        private readonly ActivityLogger $activityLogger,
    ) {
    }
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Contract::class);

        $baseQuery = Contract::query()
            ->with([
                'rfq:id,rfq_number,title,project_id,procurement_package_id',
                'rfq.project:id,name,name_en',
                'rfq.procurementPackage:id,package_no,name',
                'supplier:id,legal_name_en,supplier_code',
                'template:id,code,name_en',
            ])
            ->withCount(['variations', 'invoices'])
            ->orderByDesc('created_at');

        $metrics = [
            'total' => (clone $baseQuery)->count(),
            'draft' => (clone $baseQuery)->where('status', Contract::STATUS_DRAFT)->count(),
            'active' => (clone $baseQuery)->where('status', Contract::STATUS_ACTIVE)->count(),
            'completed' => (clone $baseQuery)->where('status', Contract::STATUS_COMPLETED)->count(),
        ];

        $query = $baseQuery
            ->when($request->filled('status'), fn ($q) => $q->where('status', (string) $request->input('status')))
            ->when($request->filled('search'), function ($q) use ($request) {
                $search = (string) $request->input('search');
                $q->where(function ($sub) use ($search) {
                    $sub->where('contract_number', 'ilike', "%{$search}%")
                        ->orWhereHas('rfq', fn ($rfqQuery) => $rfqQuery
                            ->where('rfq_number', 'ilike', "%{$search}%")
                            ->orWhere('title', 'ilike', "%{$search}%"))
                        ->orWhereHas('supplier', fn ($supplierQuery) => $supplierQuery
                            ->where('legal_name_en', 'ilike', "%{$search}%")
                            ->orWhere('supplier_code', 'ilike', "%{$search}%"));
                });
            });

        $perPage = $request->integer('per_page', 25);
        $paginator = $query->cursorPaginate($perPage)->withQueryString();

        $payload = [
            'data' => $paginator->items(),
            'path' => $paginator->path(),
            'per_page' => $paginator->perPage(),
            'next_cursor' => $paginator->nextCursor()?->encode(),
            'prev_cursor' => $paginator->previousCursor()?->encode(),
        ];

        return Inertia::render('Contracts/Index', [
            'contracts' => $payload,
            'metrics' => $metrics,
            'filters' => $request->only('status', 'search'),
            'statuses' => Contract::STATUSES,
        ]);
    }

    public function show(Request $request, Contract $contract): Response
    {
        $this->authorize('view', $contract);

        $contract->load([
            'rfq:id,rfq_number,title,project_id,procurement_package_id,status',
            'rfq.project:id,name,name_en,code',
            'rfq.procurementPackage:id,package_no,name',
            'project:id,name,name_en,code',
            'procurementPackage:id,package_no,name',
            'supplier:id,legal_name_en,supplier_code,email,phone',
            'template:id,code,name_en,name_ar',
            'createdBy:id,name',
            'updatedBy:id,name',
            'submittedForReviewBy:id,name',
            'reviewCompletedBy:id,name',
            'activities' => fn ($q) => $q->orderByDesc('created_at'),
            'variations.submittedBy:id,name',
            'variations.approvedBy:id,name',
            'variations.rejectedBy:id,name',
            'variations.createdBy:id,name',
            'invoices.submittedBy:id,name',
            'invoices.approvedBy:id,name',
            'invoices.rejectedBy:id,name',
            'invoices.paidBy:id,name',
            'invoices.createdBy:id,name',
            'invoices.updatedBy:id,name',
            'draftArticles',
            'reviews.decisionBy:id,name',
            'issuePackages.preparedBy:id,name',
            'currentIssuePackage.preparedBy:id,name',
            'signatories.createdBy:id,name',
            'signatories.updatedBy:id,name',
            'signatureEvents.signatory:id,name,signatory_type',
            'signatureEvents.changedBy:id,name',
            'executedBy:id,name',
            'administrationBaselines.preparedBy:id,name',
            'administrationInitializedBy:id,name',
            'closeoutRecords.preparedBy:id,name',
            'closeoutInitializedBy:id,name',
            'closeoutCompletedBy:id,name',
            'defectItems.createdBy:id,name',
            'defectItems.updatedBy:id,name',
            'defectItems.events.changedBy:id,name',
            'retentionReleases.submittedBy:id,name',
            'retentionReleases.approvedBy:id,name',
            'retentionReleases.rejectedBy:id,name',
            'retentionReleases.releasedBy:id,name',
            'retentionReleases.createdBy:id,name',
            'claims.createdBy:id,name',
            'notices.createdBy:id,name',
            'securities.createdBy:id,name',
            'obligations.createdBy:id,name',
        ]);

        $contract->load('generatedDocuments.generatedBy');
        $readiness = app(ContractSignaturePackageService::class)->checkReadiness($contract);
        $documentReadinessContract = app(\App\Services\Contracts\ContractDocumentReadinessService::class)->checkContractDocumentReadiness($contract);
        $documentReadinessSignature = app(\App\Services\Contracts\ContractDocumentReadinessService::class)->checkSignaturePackageDocumentReadiness($contract);
        $administrationReadiness = $contract->isExecuted()
            ? app(\App\Services\Contracts\ContractAdministrationBaselineService::class)->checkAdministrationReadiness($contract)
            : ['is_ready' => false, 'issues' => []];
        $variationEligibility = app(\App\Services\Contracts\ContractVariationService::class)->checkVariationEligibility($contract);
        $invoiceEligibility = app(\App\Services\Contracts\ContractInvoiceService::class)->checkInvoiceEligibility($contract);
        $closeoutReadiness = app(\App\Services\Contracts\ContractCloseoutService::class)->checkCloseoutReadiness($contract);
        $defectEligibility = app(\App\Services\Contracts\ContractDefectService::class)->checkDefectEligibility($contract);
        $retentionEligibility = app(\App\Services\Contracts\ContractRetentionReleaseService::class)->checkRetentionEligibility($contract);
        $claimEligibility = app(\App\Services\Contracts\ContractClaimService::class)->checkClaimEligibility($contract);
        $noticeEligibility = app(\App\Services\Contracts\ContractNoticeService::class)->checkNoticeEligibility($contract);
        $securityEligibility = app(\App\Services\Contracts\ContractSecurityService::class)->checkSecurityEligibility($contract);
        $obligationEligibility = app(\App\Services\Contracts\ContractObligationService::class)->checkObligationEligibility($contract);

        return Inertia::render('Contracts/Show', [
            'contract' => $contract,
            'financials' => [
                'current_contract_value' => $contract->getCurrentContractValue(),
                'approved_invoice_total' => $contract->getApprovedInvoiceTotal(),
                'paid_invoice_total' => $contract->getPaidInvoiceTotal(),
                'outstanding_balance' => $contract->getOutstandingBalance(),
            ],
            'source' => [
                'rfq' => $contract->rfq ? $contract->rfq->only(['id', 'rfq_number', 'title', 'status']) : null,
                'project' => $contract->project
                    ? $contract->project->only(['id', 'name', 'name_en', 'code'])
                    : ($contract->rfq?->project?->only(['id', 'name', 'name_en', 'code']) ?? null),
                'package' => $contract->procurementPackage
                    ? $contract->procurementPackage->only(['id', 'package_no', 'name'])
                    : ($contract->rfq?->procurementPackage?->only(['id', 'package_no', 'name']) ?? null),
                'supplier' => $contract->supplier
                    ? $contract->supplier->only(['id', 'legal_name_en', 'supplier_code'])
                    : null,
                'template' => $contract->template
                    ? $contract->template->only(['id', 'code', 'name_en', 'name_ar'])
                    : null,
            ],
            'review' => [
                'status' => $contract->status,
                'current_stage' => $this->inferStageFromStatus($contract->status),
                'submitted_for_review_at' => $contract->submitted_for_review_at?->toIso8601String(),
                'submitted_for_review_by' => $contract->submittedForReviewBy?->only(['id', 'name']),
                'review_completed_at' => $contract->review_completed_at?->toIso8601String(),
                'review_completed_by' => $contract->reviewCompletedBy?->only(['id', 'name']),
                'return_reason' => $contract->review_return_reason,
                'approval_summary' => $contract->approval_summary,
                'history' => $contract->reviews->map(static function (\App\Models\ContractReview $review): array {
                    return [
                        'id' => (string) $review->id,
                        'stage' => $review->review_stage,
                        'decision' => $review->decision,
                        'from_status' => $review->from_status,
                        'to_status' => $review->to_status,
                        'notes' => $review->review_notes,
                        'decided_by' => $review->decisionBy?->name,
                        'decided_at' => $review->created_at?->toIso8601String(),
                    ];
                }),
            ],
            'document_readiness_contract' => $documentReadinessContract,
            'document_readiness_signature' => $documentReadinessSignature,
            'generated_documents' => $contract->generatedDocuments->map(static function (\App\Models\ContractGeneratedDocument $d): array {
                return [
                    'id' => (string) $d->id,
                    'document_type' => $d->document_type,
                    'file_name' => $d->file_name,
                    'generation_source' => $d->generation_source,
                    'snapshot_issue_version' => $d->snapshot_issue_version,
                    'generated_by' => $d->generatedBy?->only(['id', 'name']),
                    'generated_at' => $d->generated_at?->toIso8601String(),
                ];
            })->values()->all(),
            'can_generate_documents' => $request->user()?->can('update', $contract) ?? false,
            'signature' => [
                'status' => $contract->status,
                'is_locked_for_signature' => (bool) $contract->is_locked_for_signature,
                'finalized_for_signature_at' => $contract->finalized_for_signature_at?->toIso8601String(),
                'finalized_for_signature_by' => $contract->finalizedForSignatureBy?->only(['id', 'name']),
                'current_issue_package' => $contract->currentIssuePackage ? [
                    'id' => (string) $contract->currentIssuePackage->id,
                    'issue_version' => $contract->currentIssuePackage->issue_version,
                    'package_status' => $contract->currentIssuePackage->package_status,
                    'prepared_at' => $contract->currentIssuePackage->prepared_at?->toIso8601String(),
                    'prepared_by' => $contract->currentIssuePackage->preparedBy?->only(['id', 'name']),
                    'snapshot_article_count' => $contract->currentIssuePackage->snapshot_article_count,
                ] : null,
                'issue_history' => $contract->issuePackages->map(static function (ContractIssuePackage $pkg): array {
                    return [
                        'id' => (string) $pkg->id,
                        'issue_version' => $pkg->issue_version,
                        'package_status' => $pkg->package_status,
                        'prepared_at' => $pkg->prepared_at?->toIso8601String(),
                        'prepared_by' => $pkg->preparedBy?->only(['id', 'name']),
                        'notes' => $pkg->notes,
                        'snapshot_article_count' => $pkg->snapshot_article_count,
                    ];
                }),
                'readiness' => [
                    'is_ready' => $readiness['is_ready'],
                    'issues' => $readiness['issues'],
                ],
            ],
            'signatories' => $contract->signatories->map(static function (\App\Models\ContractSignatory $s): array {
                return [
                    'id' => (string) $s->id,
                    'signatory_type' => $s->signatory_type,
                    'name' => $s->name,
                    'email' => $s->email,
                    'title' => $s->title,
                    'sign_order' => $s->sign_order,
                    'is_required' => $s->is_required,
                    'status' => $s->status,
                    'signed_at' => $s->signed_at?->toIso8601String(),
                    'notes' => $s->notes,
                    'created_by' => $s->createdBy?->only(['id', 'name']),
                    'updated_by' => $s->updatedBy?->only(['id', 'name']),
                ];
            })->values()->all(),
            'signature_events' => $contract->signatureEvents->map(static function (\App\Models\ContractSignatureEvent $e): array {
                return [
                    'id' => (string) $e->id,
                    'event_type' => $e->event_type,
                    'event_notes' => $e->event_notes,
                    'old_status' => $e->old_status,
                    'new_status' => $e->new_status,
                    'signatory' => $e->signatory ? $e->signatory->only(['id', 'name', 'signatory_type']) : null,
                    'changed_by' => $e->changedBy?->only(['id', 'name']),
                    'created_at' => $e->created_at?->toIso8601String(),
                ];
            })->values()->all(),
            'execution' => [
                'executed_at' => $contract->executed_at?->toIso8601String(),
                'executed_by' => $contract->executedBy?->only(['id', 'name']),
            ],
            'signatory_summary' => [
                'total' => $contract->signatories->count(),
                'signed' => $contract->signatories->where('status', 'signed')->count(),
                'pending' => $contract->signatories->where('status', 'pending')->count(),
                'declined' => $contract->signatories->where('status', 'declined')->count(),
                'skipped' => $contract->signatories->where('status', 'skipped')->count(),
            ],
            'administration' => [
                'status' => $contract->administration_status ?? 'not_initialized',
                'initialized_at' => $contract->administration_initialized_at?->toIso8601String(),
                'initialized_by' => $contract->administrationInitializedBy?->only(['id', 'name']),
                'effective_date' => $contract->effective_date?->toIso8601String(),
                'commencement_date' => $contract->commencement_date?->toIso8601String(),
                'completion_date_planned' => $contract->completion_date_planned?->toIso8601String(),
                'contract_value_final' => $contract->contract_value_final !== null ? (string) $contract->contract_value_final : null,
                'currency_final' => $contract->currency_final,
                'supplier_reference_no' => $contract->supplier_reference_no,
                'administration_notes' => $contract->administration_notes,
                'readiness' => $administrationReadiness,
                'baseline_history' => $contract->administrationBaselines->map(static function (\App\Models\ContractAdministrationBaseline $b): array {
                    return [
                        'id' => (string) $b->id,
                        'baseline_version' => $b->baseline_version,
                        'administration_status' => $b->administration_status,
                        'effective_date' => $b->effective_date?->toIso8601String(),
                        'commencement_date' => $b->commencement_date?->toIso8601String(),
                        'completion_date_planned' => $b->completion_date_planned?->toIso8601String(),
                        'contract_value_final' => $b->contract_value_final !== null ? (string) $b->contract_value_final : null,
                        'currency_final' => $b->currency_final,
                        'prepared_by' => $b->preparedBy?->only(['id', 'name']),
                        'prepared_at' => $b->prepared_at?->toIso8601String(),
                    ];
                })->values()->all(),
            ],
            'variation_summary' => [
                'variation_count_total' => (int) ($contract->variation_count_total ?? 0),
                'variation_count_approved' => (int) ($contract->variation_count_approved ?? 0),
                'variation_total_approved' => $contract->variation_total_approved !== null ? (string) $contract->variation_total_approved : null,
                'variation_days_total_approved' => (int) ($contract->variation_days_total_approved ?? 0),
            ],
            'variation_eligibility' => $variationEligibility,
            'invoice_summary' => [
                'invoice_count_total' => (int) ($contract->invoice_count_total ?? 0),
                'invoice_count_approved' => (int) ($contract->invoice_count_approved ?? 0),
                'invoice_count_paid' => (int) ($contract->invoice_count_paid ?? 0),
                'invoice_total_submitted' => $contract->invoice_total_submitted !== null ? (string) $contract->invoice_total_submitted : null,
                'invoice_total_approved' => $contract->invoice_total_approved !== null ? (string) $contract->invoice_total_approved : null,
                'invoice_total_paid' => $contract->invoice_total_paid !== null ? (string) $contract->invoice_total_paid : null,
            ],
            'invoice_eligibility' => $invoiceEligibility,
            'invoices' => $contract->invoices->map(static function (\App\Models\ContractInvoice $inv): array {
                return [
                    'id' => (string) $inv->id,
                    'invoice_no' => $inv->invoice_no,
                    'title' => $inv->title ?? $inv->invoice_no,
                    'invoice_type' => $inv->invoice_type ?? 'interim',
                    'status' => $inv->status,
                    'description' => $inv->description,
                    'amount' => $inv->amount !== null ? (string) $inv->amount : null,
                    'currency' => $inv->currency,
                    'period_from' => $inv->period_from?->toIso8601String(),
                    'period_to' => $inv->period_to?->toIso8601String(),
                    'submitted_at' => $inv->submitted_at?->toIso8601String(),
                    'submitted_by' => $inv->submittedBy?->only(['id', 'name']),
                    'approved_at' => $inv->approved_at?->toIso8601String(),
                    'approved_by' => $inv->approvedBy?->only(['id', 'name']),
                    'rejected_at' => $inv->rejected_at?->toIso8601String(),
                    'rejected_by' => $inv->rejectedBy?->only(['id', 'name']),
                    'paid_at' => $inv->paid_at?->toIso8601String(),
                    'paid_by' => $inv->paidBy?->only(['id', 'name']),
                    'decision_notes' => $inv->decision_notes,
                ];
            })->values()->all(),
            'variations' => $contract->variations->map(static function (\App\Models\ContractVariation $v): array {
                return [
                    'id' => (string) $v->id,
                    'variation_no' => $v->variation_no,
                    'title' => $v->title,
                    'variation_type' => $v->variation_type,
                    'status' => $v->status,
                    'reason' => $v->reason,
                    'description' => $v->description,
                    'commercial_delta' => $v->commercial_delta !== null ? (string) $v->commercial_delta : null,
                    'currency' => $v->currency,
                    'time_delta_days' => $v->time_delta_days,
                    'submitted_at' => $v->submitted_at?->toIso8601String(),
                    'submitted_by' => $v->submittedBy?->only(['id', 'name']),
                    'approved_at' => $v->approved_at?->toIso8601String(),
                    'approved_by' => $v->approvedBy?->only(['id', 'name']),
                    'rejected_at' => $v->rejected_at?->toIso8601String(),
                    'rejected_by' => $v->rejectedBy?->only(['id', 'name']),
                    'decision_notes' => $v->decision_notes,
                ];
            })->values()->all(),
            'closeout_summary' => [
                'closeout_status' => $contract->closeout_status ?? 'not_ready',
                'closeout_initialized_at' => $contract->closeout_initialized_at?->toIso8601String(),
                'closeout_initialized_by' => $contract->closeoutInitializedBy?->only(['id', 'name']),
                'closeout_completed_at' => $contract->closeout_completed_at?->toIso8601String(),
                'closeout_completed_by' => $contract->closeoutCompletedBy?->only(['id', 'name']),
                'practical_completion_at' => $contract->practical_completion_at?->toIso8601String(),
                'final_completion_at' => $contract->final_completion_at?->toIso8601String(),
                'closeout_notes' => $contract->closeout_notes,
            ],
            'closeout_readiness' => $closeoutReadiness,
            'closeout_history' => $contract->closeoutRecords->map(static function (\App\Models\ContractCloseoutRecord $r): array {
                return [
                    'id' => (string) $r->id,
                    'closeout_status' => $r->closeout_status,
                    'practical_completion_at' => $r->practical_completion_at?->toIso8601String(),
                    'final_completion_at' => $r->final_completion_at?->toIso8601String(),
                    'closeout_notes' => $r->closeout_notes,
                    'prepared_by' => $r->preparedBy?->only(['id', 'name']),
                    'prepared_at' => $r->prepared_at?->toIso8601String(),
                ];
            })->values()->all(),
            'warranty_summary' => [
                'defects_liability_start_at' => $contract->defects_liability_start_at?->toIso8601String(),
                'defects_liability_end_at' => $contract->defects_liability_end_at?->toIso8601String(),
                'warranty_status' => $contract->warranty_status ?? 'open',
                'warranty_initialized' => $contract->defects_liability_start_at !== null || $contract->defects_liability_end_at !== null,
            ],
            'defect_eligibility' => $defectEligibility,
            'defect_items' => $contract->defectItems->map(static function (\App\Models\ContractDefectItem $d): array {
                return [
                    'id' => (string) $d->id,
                    'reference_no' => $d->reference_no,
                    'title' => $d->title,
                    'description' => $d->description,
                    'status' => $d->status,
                    'reported_at' => $d->reported_at?->toIso8601String(),
                    'resolved_at' => $d->resolved_at?->toIso8601String(),
                    'closed_at' => $d->closed_at?->toIso8601String(),
                    'notes' => $d->notes,
                    'created_by' => $d->createdBy?->only(['id', 'name']),
                    'events' => $d->events->map(static function (\App\Models\ContractDefectEvent $e): array {
                        return [
                            'id' => (string) $e->id,
                            'old_status' => $e->old_status,
                            'new_status' => $e->new_status,
                            'event_notes' => $e->event_notes,
                            'changed_by' => $e->changedBy?->only(['id', 'name']),
                            'created_at' => $e->created_at?->toIso8601String(),
                        ];
                    })->values()->all(),
                ];
            })->values()->all(),
            'retention_summary' => [
                'retention_total_held' => $contract->retention_total_held !== null ? (string) $contract->retention_total_held : null,
                'retention_total_pending' => $contract->retention_total_pending !== null ? (string) $contract->retention_total_pending : null,
                'retention_total_released' => $contract->retention_total_released !== null ? (string) $contract->retention_total_released : null,
            ],
            'retention_eligibility' => $retentionEligibility,
            'retention_releases' => $contract->retentionReleases->map(static function (\App\Models\ContractRetentionRelease $r): array {
                return [
                    'id' => (string) $r->id,
                    'release_no' => $r->release_no,
                    'status' => $r->status,
                    'amount' => (string) $r->amount,
                    'currency' => $r->currency,
                    'reason' => $r->reason,
                    'submitted_at' => $r->submitted_at?->toIso8601String(),
                    'submitted_by' => $r->submittedBy?->only(['id', 'name']),
                    'approved_at' => $r->approved_at?->toIso8601String(),
                    'approved_by' => $r->approvedBy?->only(['id', 'name']),
                    'rejected_at' => $r->rejected_at?->toIso8601String(),
                    'rejected_by' => $r->rejectedBy?->only(['id', 'name']),
                    'released_at' => $r->released_at?->toIso8601String(),
                    'released_by' => $r->releasedBy?->only(['id', 'name']),
                    'decision_notes' => $r->decision_notes,
                ];
            })->values()->all(),
            'claim_eligibility' => $claimEligibility,
            'notice_eligibility' => $noticeEligibility,
            'claims_summary' => [
                'total' => $contract->claims()->count(),
                'draft' => $contract->claims()->where('status', 'draft')->count(),
                'submitted' => $contract->claims()->where('status', 'submitted')->count(),
                'under_review' => $contract->claims()->where('status', 'under_review')->count(),
                'resolved' => $contract->claims()->where('status', 'resolved')->count(),
                'rejected' => $contract->claims()->where('status', 'rejected')->count(),
            ],
            'notices_summary' => [
                'total' => $contract->notices()->count(),
                'draft' => $contract->notices()->where('status', 'draft')->count(),
                'issued' => $contract->notices()->where('status', 'issued')->count(),
                'responded' => $contract->notices()->where('status', 'responded')->count(),
                'closed' => $contract->notices()->where('status', 'closed')->count(),
            ],
            'contract_claims' => $contract->claims->map(static function (\App\Models\ContractClaim $c): array {
                return [
                    'id' => (string) $c->id,
                    'claim_no' => $c->claim_no,
                    'title' => $c->title,
                    'description' => $c->description,
                    'status' => $c->status,
                    'submitted_at' => $c->submitted_at?->toIso8601String(),
                    'resolved_at' => $c->resolved_at?->toIso8601String(),
                    'rejected_at' => $c->rejected_at?->toIso8601String(),
                    'notes' => $c->notes,
                    'created_by' => $c->createdBy?->only(['id', 'name']),
                ];
            })->values()->all(),
            'contract_notices' => $contract->notices->map(static function (\App\Models\ContractNotice $n): array {
                return [
                    'id' => (string) $n->id,
                    'notice_no' => $n->notice_no,
                    'title' => $n->title,
                    'description' => $n->description,
                    'status' => $n->status,
                    'issued_at' => $n->issued_at?->toIso8601String(),
                    'responded_at' => $n->responded_at?->toIso8601String(),
                    'closed_at' => $n->closed_at?->toIso8601String(),
                    'notes' => $n->notes,
                    'created_by' => $n->createdBy?->only(['id', 'name']),
                ];
            })->values()->all(),
            'can' => [
                'send_signature' => $request->user()->can('sendForSignature', $contract),
                'activate' => $request->user()->can('activate', $contract),
                'complete' => $request->user()->can('complete', $contract),
                'terminate' => $request->user()->can('terminate', $contract),
                'create_variation' => $request->user()->can('update', $contract) && $contract->canManageVariations(),
                'create_invoice' => $request->user()->can('update', $contract) && $contract->canManageInvoices(),
                'approve_invoice' => $request->user()->can('update', $contract) && $contract->canManageInvoices(),
                'pay_invoice' => $request->user()->can('update', $contract) && $contract->canManageInvoices(),
                'issue_signature_package' => $request->user()->can('sendForSignature', $contract),
                'manage_signatures' => $request->user()->can('update', $contract),
                'initialize_administration' => $request->user()->can('update', $contract) && $contract->canInitializeAdministration(),
                'initialize_closeout' => $request->user()->can('update', $contract) && $contract->canInitializeCloseout() && ! $contract->isReadyForCloseout() && ! $contract->isClosedOut(),
                'complete_closeout' => $request->user()->can('update', $contract) && $contract->canCompleteCloseout(),
                'initialize_warranty' => $request->user()->can('update', $contract) && $contract->canManageDefects(),
                'manage_defects' => $request->user()->can('update', $contract) && $contract->canManageDefects(),
                'manage_retention' => $request->user()->can('update', $contract) && $contract->canManageRetentionReleases(),
                'manage_claims' => $request->user()->can('update', $contract) && $contract->canManageClaims(),
                'manage_notices' => $request->user()->can('update', $contract) && $contract->canManageNotices(),
                'manage_securities' => $request->user()->can('update', $contract) && $contract->canManageSecurities(),
                'manage_obligations' => $request->user()->can('update', $contract) && $contract->canManageObligations(),
            ],
            'security_eligibility' => $securityEligibility,
            'securities_summary' => [
                'total' => $contract->securities()->count(),
                'active' => $contract->securities()->where('status', 'active')->count(),
                'expiring' => $contract->securities()->where('status', 'expiring')->count(),
                'expired' => $contract->securities()->where('status', 'expired')->count(),
                'released' => $contract->securities()->where('status', 'released')->count(),
            ],
            'contract_securities' => $contract->securities->map(static function (\App\Models\ContractSecurity $s): array {
                return [
                    'id' => (string) $s->id,
                    'instrument_type' => $s->instrument_type,
                    'status' => $s->status,
                    'provider_name' => $s->provider_name,
                    'reference_no' => $s->reference_no,
                    'amount' => $s->amount !== null ? (string) $s->amount : null,
                    'currency' => $s->currency,
                    'issued_at' => $s->issued_at?->toIso8601String(),
                    'expires_at' => $s->expires_at?->toIso8601String(),
                    'released_at' => $s->released_at?->toIso8601String(),
                    'notes' => $s->notes,
                    'created_by' => $s->createdBy?->only(['id', 'name']),
                ];
            })->values()->all(),
            'obligation_eligibility' => $obligationEligibility,
            'obligations_summary' => [
                'total' => $contract->obligations()->count(),
                'not_started' => $contract->obligations()->where('status', 'not_started')->count(),
                'in_progress' => $contract->obligations()->where('status', 'in_progress')->count(),
                'submitted' => $contract->obligations()->where('status', 'submitted')->count(),
                'fulfilled' => $contract->obligations()->where('status', 'fulfilled')->count(),
                'overdue' => $contract->obligations()->where('status', 'overdue')->count(),
            ],
            'contract_obligations' => $contract->obligations->map(static function (\App\Models\ContractObligation $o): array {
                $dueAt = $o->due_at;
                $isOverdue = $dueAt && $dueAt->isPast() && $o->status !== \App\Models\ContractObligation::STATUS_FULFILLED;
                return [
                    'id' => (string) $o->id,
                    'reference_no' => $o->reference_no,
                    'title' => $o->title,
                    'description' => $o->description,
                    'party_type' => $o->party_type,
                    'status' => $o->status,
                    'due_at' => $o->due_at?->toIso8601String(),
                    'submitted_at' => $o->submitted_at?->toIso8601String(),
                    'fulfilled_at' => $o->fulfilled_at?->toIso8601String(),
                    'notes' => $o->notes,
                    'is_overdue' => $isOverdue,
                    'created_by' => $o->createdBy?->only(['id', 'name']),
                ];
            })->values()->all(),
            'timeline' => TimelineBuilder::forSubject(Contract::class, (string) $contract->id),
        ]);
    }

    private function inferStageFromStatus(string $status): ?string
    {
        return match ($status) {
            Contract::STATUS_IN_LEGAL_REVIEW => 'legal',
            Contract::STATUS_IN_COMMERCIAL_REVIEW => 'commercial',
            Contract::STATUS_IN_MANAGEMENT_REVIEW => 'management',
            default => null,
        };
    }

    public function sendForSignature(Request $request, Contract $contract): RedirectResponse
    {
        $this->authorize('sendForSignature', $contract);

        try {
            app(ContractLifecycleService::class)->sendForSignature($contract, $request->user());
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with('success', 'Contract sent for signature.');
    }

    public function activate(Request $request, Contract $contract): RedirectResponse
    {
        $this->authorize('activate', $contract);

        try {
            app(ContractLifecycleService::class)->activateContract($contract, $request->user());
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with('success', 'Contract activated.');
    }

    public function complete(Request $request, Contract $contract): RedirectResponse
    {
        $this->authorize('complete', $contract);

        try {
            app(ContractLifecycleService::class)->completeContract($contract, $request->user());
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with('success', 'Contract completed.');
    }

    public function terminate(Request $request, Contract $contract): RedirectResponse
    {
        $this->authorize('terminate', $contract);

        $validated = $request->validate([
            'reason' => 'required|string|max:2000',
        ]);

        try {
            app(ContractLifecycleService::class)->terminateContract(
                $contract,
                $request->user(),
                $validated['reason']
            );
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with('success', 'Contract terminated.');
    }

    public function issueSignaturePackage(Request $request, Contract $contract): RedirectResponse
    {
        $this->authorize('sendForSignature', $contract);

        /** @var \App\Models\User $user */
        $user = $request->user();

        $validated = $request->validate([
            'notes' => ['nullable', 'string'],
        ]);

        $fromStatus = $contract->status;

        try {
            $package = $this->signaturePackageService->issueSignaturePackage(
                $contract,
                $user,
                $validated['notes'] ?? null
            );
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        $this->activityLogger->log(
            'contracts.contract.signature_package_issued',
            $contract,
            ['status' => $fromStatus],
            [
                'status' => $contract->status,
                'issue_package_id' => (string) $package->id,
                'issue_version' => $package->issue_version,
                'article_count' => $package->snapshot_article_count,
            ],
            $user
        );

        if ($fromStatus !== $contract->status) {
            $this->activityLogger->log(
                'contracts.contract.status_changed',
                $contract,
                ['status' => $fromStatus],
                ['status' => $contract->status],
                $user
            );
        }

        if ($contract->isLockedForSignature()) {
            $this->activityLogger->log(
                'contracts.contract.locked_for_signature',
                $contract,
                [],
                [],
                $user
            );
        }

        return back()->with('success', 'Signature package issued.');
    }
}
