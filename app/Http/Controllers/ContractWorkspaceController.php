<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Contract;
use App\Models\ContractArticle;
use App\Models\ContractDraftArticle;
use App\Models\ContractDraftArticleVersion;
use App\Models\ContractReview;
use App\Services\ActivityLogger;
use App\Services\Contracts\ContractDraftRenderingService;
use App\Services\Contracts\ContractDraftWorkspaceService;
use App\Services\Contracts\ContractDraftArticleVersionService;
use App\Services\Contracts\ContractDraftNegotiationService;
use App\Services\Contracts\ContractReviewWorkflowService;
use App\Services\Contracts\ContractVariableRegistry;
use App\Http\Requests\Contracts\SubmitContractForReviewRequest;
use App\Http\Requests\Contracts\StoreContractReviewDecisionRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use RuntimeException;

final class ContractWorkspaceController extends Controller
{
    public function __construct(
        private readonly ContractDraftWorkspaceService $workspaceService,
        private readonly ContractDraftArticleVersionService $versionService,
        private readonly ContractDraftNegotiationService $negotiationService,
        private readonly ContractReviewWorkflowService $reviewService,
        private readonly ContractDraftRenderingService $renderingService,
        private readonly ActivityLogger $activityLogger,
    ) {
    }

    public function edit(Request $request, Contract $contract): InertiaResponse
    {
        $this->authorize('view', $contract);

        $contract->load([
            'rfq.project',
            'rfq.procurementPackage',
            'project',
            'procurementPackage',
            'supplier',
            'template',
            'submittedForReviewBy',
            'reviewCompletedBy',
            'variableOverrides',
            'draftArticles' => fn ($q) => $q
                ->withCount('versions')
                ->with('negotiationLogs.changedBy')
                ->orderBy('sort_order'),
            'reviews.decisionBy',
        ]);

        $articles = ContractArticle::query()
            ->with('currentVersion')
            ->where('status', ContractArticle::STATUS_ACTIVE)
            ->orderBy('serial')
            ->get()
            ->map(fn (ContractArticle $article) => [
                'id' => (string) $article->id,
                'code' => $article->code,
                'serial' => $article->serial,
                'category' => $article->category,
                'title_en' => $article->currentVersion?->title_en,
                'title_ar' => $article->currentVersion?->title_ar,
                'snippet_en' => $this->makeSnippet($article->currentVersion?->content_en),
            ]);

        $allowedTransitions = $contract->getAllowedPreparationTransitions();

        return Inertia::render('Contracts/Edit', [
            'contract' => $contract,
            'articles' => $articles,
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
            'allowedStatusTransitions' => $allowedTransitions,
            'review' => [
                'status' => $contract->status,
                'current_stage' => $this->inferStageFromStatus($contract->status),
                'submitted_for_review_at' => $contract->submitted_for_review_at?->toIso8601String(),
                'submitted_for_review_by' => $contract->submittedForReviewBy?->only(['id', 'name']),
                'review_completed_at' => $contract->review_completed_at?->toIso8601String(),
                'review_completed_by' => $contract->reviewCompletedBy?->only(['id', 'name']),
                'return_reason' => $contract->review_return_reason,
                'approval_summary' => $contract->approval_summary,
                'history' => $contract->reviews->map(static function (ContractReview $review): array {
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
            'variable_groups' => ContractVariableRegistry::getGrouped(),
            'variable_overrides' => $contract->variableOverrides->pluck('value_text', 'variable_key')->all(),
            'unresolved_variable_keys' => $this->renderingService->getUnresolvedKeysForContract($contract),
            'signature_readiness' => app(\App\Services\Contracts\ContractSignaturePackageService::class)->checkReadiness($contract),
        ]);
    }

    public function update(Request $request, Contract $contract): RedirectResponse
    {
        $this->authorize('update', $contract);

        if ($contract->isLockedForSignature()) {
            return back()->with('error', 'Contract is locked for signature and cannot be edited.');
        }

        $validated = $request->validate([
            'title_en' => ['nullable', 'string', 'max:255'],
            'title_ar' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'internal_notes' => ['nullable', 'string'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
        ]);

        /** @var \App\Models\User $user */
        $user = $request->user();

        $old = $contract->only(['title_en', 'title_ar', 'description', 'internal_notes', 'start_date', 'end_date']);

        $updated = $this->workspaceService->updateHeader($contract, $validated, $user);

        $new = $updated->only(['title_en', 'title_ar', 'description', 'internal_notes', 'start_date', 'end_date']);

        if ($old !== $new) {
            $this->activityLogger->log(
                'contracts.contract.metadata_updated',
                $updated,
                $old,
                $new,
                $user
            );
        }

        return back()->with('success', 'Contract draft metadata updated.');
    }

    public function updateStatus(Request $request, Contract $contract): RedirectResponse
    {
        $this->authorize('update', $contract);

        if ($contract->isLockedForSignature()) {
            return back()->with('error', 'Contract is locked for signature and its status cannot be changed in the workspace.');
        }

        $validated = $request->validate([
            'status' => ['required', 'string'],
        ]);

        $newStatus = $validated['status'];

        /** @var \App\Models\User $user */
        $user = $request->user();

        $oldStatus = $contract->status;

        try {
            $this->workspaceService->updateStatus($contract, $newStatus, $user);
        } catch (RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        if ($oldStatus !== $contract->status) {
            $this->activityLogger->log(
                'contracts.contract.status_changed',
                $contract,
                ['status' => $oldStatus],
                ['status' => $contract->status],
                $user
            );
        }

        return back()->with('success', 'Contract draft status updated.');
    }

    public function addArticle(Request $request, Contract $contract): RedirectResponse
    {
        $this->authorize('update', $contract);

        if ($contract->isLockedForSignature()) {
            return back()->with('error', 'Contract is locked for signature and cannot be edited.');
        }

        $validated = $request->validate([
            'contract_article_id' => ['required', 'uuid', 'exists:contract_articles,id'],
        ]);

        /** @var \App\Models\User $user */
        $user = $request->user();

        try {
            $draft = $this->workspaceService->addLibraryArticle(
                $contract,
                $validated['contract_article_id'],
                $user
            );
        } catch (RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        $this->activityLogger->log(
            'contracts.contract.draft_article_added',
            $contract,
            [],
            [
                'draft_article_id' => (string) $draft->id,
                'article_code' => $draft->article_code,
                'origin_type' => $draft->origin_type,
            ],
            $user
        );

        return back()->with('success', 'Article added to contract draft.');
    }

    public function updateDraftArticle(Request $request, Contract $contract, ContractDraftArticle $draftArticle): RedirectResponse
    {
        $this->authorize('update', $contract);

        if ($contract->isLockedForSignature()) {
            return back()->with('error', 'Contract is locked for signature and cannot be edited.');
        }

        $validated = $request->validate([
            'title_en' => ['nullable', 'string'],
            'title_ar' => ['nullable', 'string'],
            'content_en' => ['nullable', 'string'],
            'content_ar' => ['nullable', 'string'],
        ]);

        /** @var \App\Models\User $user */
        $user = $request->user();

        $before = $draftArticle->only(['title_en', 'title_ar', 'content_en', 'content_ar', 'is_modified']);

        [$version, $updated] = $this->versionService->updateDraftArticleWithVersioning(
            $contract,
            $draftArticle,
            $validated,
            $user,
            null
        );

        $after = $updated->only(['title_en', 'title_ar', 'content_en', 'content_ar', 'is_modified']);

        if ($version !== null) {
            $this->activityLogger->log(
                'contracts.contract.draft_article_version_created',
                $contract,
                [],
                [
                    'draft_article_id' => (string) $updated->id,
                    'version_id' => (string) $version->id,
                    'version_number' => $version->version_number,
                ],
                $user
            );

            $this->activityLogger->log(
                'contracts.contract.draft_article_updated',
                $contract,
                $before,
                $after,
                $user
            );
        }

        return back()->with('success', 'Draft article updated.');
    }

    public function removeDraftArticle(Request $request, Contract $contract, ContractDraftArticle $draftArticle): RedirectResponse
    {
        $this->authorize('update', $contract);

        if ($contract->isLockedForSignature()) {
            return back()->with('error', 'Contract is locked for signature and cannot be edited.');
        }

        /** @var \App\Models\User $user */
        $user = $request->user();

        if ($draftArticle->contract_id !== $contract->id) {
            abort(404);
        }

        $meta = [
            'draft_article_id' => (string) $draftArticle->id,
            'article_code' => $draftArticle->article_code,
            'origin_type' => $draftArticle->origin_type,
        ];

        $this->workspaceService->removeDraftArticle($contract, $draftArticle);

        $this->activityLogger->log(
            'contracts.contract.draft_article_removed',
            $contract,
            $meta,
            [],
            $user
        );

        return back()->with('success', 'Draft article removed.');
    }

    public function reorderDraftArticles(Request $request, Contract $contract): RedirectResponse
    {
        $this->authorize('update', $contract);

        if ($contract->isLockedForSignature()) {
            return back()->with('error', 'Contract is locked for signature and cannot be edited.');
        }

        $validated = $request->validate([
            'ordered_ids' => ['required', 'array', 'min:1'],
            'ordered_ids.*' => ['required', 'uuid'],
        ]);

        /** @var \App\Models\User $user */
        $user = $request->user();

        $previousOrder = $contract->draftArticles()
            ->orderBy('sort_order')
            ->pluck('id')
            ->map(static fn ($id): string => (string) $id)
            ->all();

        try {
            $this->workspaceService->reorderDraftArticles($contract, $validated['ordered_ids']);
        } catch (RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        $newOrder = $contract->draftArticles()
            ->orderBy('sort_order')
            ->pluck('id')
            ->map(static fn ($id): string => (string) $id)
            ->all();

        if ($previousOrder !== $newOrder) {
            $this->activityLogger->log(
                'contracts.contract.draft_articles_reordered',
                $contract,
                ['ordered_ids' => $previousOrder],
                ['ordered_ids' => $newOrder],
                $user
            );
        }

        return back()->with('success', 'Draft articles reordered.');
    }

    public function submitForReview(SubmitContractForReviewRequest $request, Contract $contract): RedirectResponse
    {
        $this->authorize('update', $contract);

        /** @var \App\Models\User $user */
        $user = $request->user();

        $old = ['status' => $contract->status];

        try {
            $this->reviewService->submitForReview($contract, $user);
        } catch (RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        $new = ['status' => $contract->status];

        $this->activityLogger->log(
            'contracts.contract.submitted_for_review',
            $contract,
            $old,
            $new,
            $user
        );

        return back()->with('success', 'Contract draft submitted for review.');
    }

    public function storeReviewDecision(StoreContractReviewDecisionRequest $request, Contract $contract): RedirectResponse
    {
        $this->authorize('update', $contract);

        $validated = $request->validated();

        /** @var \App\Models\User $user */
        $user = $request->user();

        $old = ['status' => $contract->status];

        try {
            $updated = $this->reviewService->recordStageDecision(
                $contract,
                $validated['stage'],
                $validated['decision'],
                $validated['review_notes'] ?? null,
                $user
            );
        } catch (RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        $new = ['status' => $updated->status];

        $this->activityLogger->log(
            'contracts.contract.review_decision_recorded',
            $updated,
            $old,
            $new,
            $user
        );

        if ($updated->status === Contract::STATUS_APPROVED_FOR_SIGNATURE) {
            $this->activityLogger->log(
                'contracts.contract.approved_for_signature',
                $updated,
                [],
                [],
                $user
            );
        }

        return back()->with('success', 'Review decision recorded.');
    }

    public function updateDraftArticleNegotiation(
        Request $request,
        Contract $contract,
        ContractDraftArticle $draftArticle
    ): RedirectResponse {
        $this->authorize('update', $contract);

        if ($contract->isLockedForSignature()) {
            return back()->with('error', 'Contract is locked for signature and cannot be edited.');
        }

        $validated = $request->validate([
            'negotiation_status' => ['required', 'string', 'max:30'],
            'negotiation_notes' => ['nullable', 'string'],
            'legal_notes' => ['nullable', 'string'],
            'commercial_notes' => ['nullable', 'string'],
            'negotiation_internal_notes' => ['nullable', 'string'],
            'has_deviation' => ['sometimes', 'boolean'],
            'requires_special_approval' => ['sometimes', 'boolean'],
        ]);

        /** @var \App\Models\User $user */
        $user = $request->user();

        if (! in_array(
            $validated['negotiation_status'],
            ContractDraftArticle::NEGOTIATION_STATUSES,
            true
        )) {
            return back()->with('error', 'Invalid negotiation status.');
        }

        [$changed, $old, $new] = $this->negotiationService->updateNegotiationState(
            $contract,
            $draftArticle,
            $validated,
            $user
        );

        if ($changed) {
            $this->activityLogger->log(
                'contracts.contract.draft_article_negotiation_updated',
                $contract,
                $old,
                $new,
                $user
            );
        }

        return back()->with('success', 'Draft article negotiation updated.');
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

    public function compareDraftArticle(Request $request, Contract $contract, ContractDraftArticle $draftArticle): InertiaResponse
    {
        $this->authorize('view', $contract);

        if ($draftArticle->contract_id !== $contract->id) {
            abort(404);
        }

        $draftArticle->load([
            'versions.changedBy',
        ]);

        /** @var string|null $versionId */
        $versionId = $request->query('version_id');

        /** @var ContractDraftArticleVersion|null $selectedVersion */
        $selectedVersion = $versionId
            ? $draftArticle->versions->firstWhere('id', $versionId)
            : $draftArticle->versions->first();

        $versions = $draftArticle->versions->map(static function (ContractDraftArticleVersion $version): array {
            return [
                'id' => (string) $version->id,
                'version_number' => $version->version_number,
                'change_summary' => $version->change_summary,
                'changed_at' => $version->created_at?->toIso8601String(),
                'changed_by' => $version->changedBy?->name,
            ];
        })->all();

        return Inertia::render('Contracts/DraftArticleCompare', [
            'contract' => [
                'id' => (string) $contract->id,
                'contract_number' => $contract->contract_number,
            ],
            'draftArticle' => [
                'id' => (string) $draftArticle->id,
                'article_code' => $draftArticle->article_code,
                'origin_type' => $draftArticle->origin_type,
                'title_en' => $draftArticle->title_en,
                'title_ar' => $draftArticle->title_ar,
                'content_en' => $draftArticle->content_en,
                'content_ar' => $draftArticle->content_ar,
            ],
            'versions' => $versions,
            'selectedVersion' => $selectedVersion ? [
                'id' => (string) $selectedVersion->id,
                'version_number' => $selectedVersion->version_number,
                'change_summary' => $selectedVersion->change_summary,
                'changed_at' => $selectedVersion->created_at?->toIso8601String(),
                'changed_by' => $selectedVersion->changedBy?->name,
                'title_en' => $selectedVersion->title_en,
                'title_ar' => $selectedVersion->title_ar,
                'content_en' => $selectedVersion->content_en,
                'content_ar' => $selectedVersion->content_ar,
            ] : null,
        ]);
    }

    public function restoreDraftArticleVersion(
        Request $request,
        Contract $contract,
        ContractDraftArticle $draftArticle,
        ContractDraftArticleVersion $version
    ): RedirectResponse {
        $this->authorize('update', $contract);

        /** @var \App\Models\User $user */
        $user = $request->user();

        $restored = $this->versionService->restoreVersion(
            $contract,
            $draftArticle,
            $version,
            $user,
            null
        );

        $this->activityLogger->log(
            'contracts.contract.draft_article_version_created',
            $contract,
            [],
            [
                'draft_article_id' => (string) $restored->id,
                'version_id' => (string) $version->id,
                'version_number' => $version->version_number,
                'event' => 'snapshot_before_restore',
            ],
            $user
        );

        $this->activityLogger->log(
            'contracts.contract.draft_article_restored',
            $contract,
            [],
            [
                'draft_article_id' => (string) $restored->id,
                'restored_from_version_id' => (string) $version->id,
                'restored_from_version_number' => $version->version_number,
            ],
            $user
        );

        return redirect()
            ->route('contracts.draft-articles.compare', [$contract, $draftArticle])
            ->with('success', 'Draft article version restored.');
    }

    private function makeSnippet(?string $content): ?string
    {
        if ($content === null) {
            return null;
        }

        $trimmed = trim($content);

        if ($trimmed === '') {
            return null;
        }

        $snippet = mb_substr($trimmed, 0, 220);

        if (mb_strlen($trimmed) > 220) {
            $snippet .= '…';
        }

        return $snippet;
    }
}

