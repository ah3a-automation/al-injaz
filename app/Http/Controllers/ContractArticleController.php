<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Contracts\RejectContractLibraryRequest;
use App\Http\Requests\Contracts\RestoreContractArticleVersionRequest;
use App\Http\Requests\Contracts\StoreContractArticleRequest;
use App\Http\Requests\Contracts\UpdateContractArticleRequest;
use App\Models\ContractArticle;
use App\Models\ContractArticleVersion;
use App\Services\ActivityLogger;
use App\Services\Contracts\ContractArticleVersionService;
use App\Services\Contracts\ContractLibraryGovernanceService;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

final class ContractArticleController extends Controller
{
    public function __construct(
        private readonly ActivityLogger $activityLogger,
        private readonly ContractArticleVersionService $versionService,
        private readonly ContractLibraryGovernanceService $governanceService,
    ) {
    }

    public function index(Request $request): InertiaResponse
    {
        $this->authorize('viewAny', ContractArticle::class);

        $query = ContractArticle::query()
            ->with('currentVersion')
            ->when($request->filled('category'), fn ($q) => $q->where('category', (string) $request->input('category')))
            ->when($request->filled('status'), fn ($q) => $q->where('status', (string) $request->input('status')))
            ->when($request->filled('approval_status'), fn ($q) => $q->where('approval_status', (string) $request->input('approval_status')))
            ->when($request->filled('risk_tags'), function ($q) use ($request) {
                $raw = (string) $request->input('risk_tags');
                $tags = array_values(array_filter(
                    array_map('trim', explode(',', $raw)),
                    static fn (string $t): bool => $t !== ''
                ));
                if ($tags === []) {
                    return;
                }
                $q->whereHas('currentVersion', function ($vq) use ($tags): void {
                    $vq->where(function ($sub) use ($tags): void {
                        foreach ($tags as $tag) {
                            $sub->orWhereJsonContains('risk_tags', $tag);
                        }
                    });
                });
            })
            ->when($request->filled('q'), function ($q) use ($request) {
                $term = (string) $request->input('q');

                $q->where(function ($sub) use ($term) {
                    $sub->where('code', 'ilike', "%{$term}%")
                        ->orWhereHas('currentVersion', function ($versionQuery) use ($term) {
                            $versionQuery
                                ->where('title_ar', 'ilike', "%{$term}%")
                                ->orWhere('title_en', 'ilike', "%{$term}%")
                                ->orWhere('content_ar', 'ilike', "%{$term}%")
                                ->orWhere('content_en', 'ilike', "%{$term}%");
                        });
                });
            })
            ->orderBy('serial');

        $articles = $query->paginate((int) $request->input('per_page', 25))->withQueryString();

        return Inertia::render('ContractArticles/Index', [
            'articles' => $articles,
            'filters' => [
                'q' => $request->input('q'),
                'category' => $request->input('category'),
                'status' => $request->input('status'),
                'approval_status' => $request->input('approval_status'),
                'risk_tags' => (string) $request->input('risk_tags', ''),
                'per_page' => $request->input('per_page', 25),
            ],
            'categories' => ContractArticle::CATEGORIES,
            'statuses' => ContractArticle::STATUSES,
            'approvalStatuses' => ContractArticle::APPROVAL_STATUSES,
            'allowedRiskTags' => ContractArticleVersion::RISK_TAGS,
            'can' => [
                'create' => $request->user()->can('create', ContractArticle::class),
                'manage' => $request->user()->can('contract.manage'),
            ],
        ]);
    }

    public function create(Request $request): InertiaResponse
    {
        $this->authorize('create', ContractArticle::class);

        return Inertia::render('ContractArticles/Create', [
            'categories' => ContractArticle::CATEGORIES,
            'statuses' => ContractArticle::STATUSES,
            'allowedRiskTags' => ContractArticleVersion::RISK_TAGS,
        ]);
    }

    public function show(Request $request, ContractArticle $contractArticle): InertiaResponse
    {
        $this->authorize('view', $contractArticle);

        $contractArticle->load([
            'currentVersion',
            'versions' => fn ($q) => $q->orderByDesc('version_number'),
            'createdBy:id,name',
            'updatedBy:id,name',
            'submittedBy:id,name',
            'contractsManagerApprovedBy:id,name',
            'legalApprovedBy:id,name',
        ]);

        return Inertia::render('ContractArticles/Show', [
            'article' => $contractArticle,
            'can' => [
                'update' => $request->user()->can('update', $contractArticle),
                'submit_for_approval' => $request->user()->can('submitForApproval', $contractArticle),
                'approve_contracts' => $request->user()->can('approveContracts', $contractArticle),
                'approve_legal' => $request->user()->can('approveLegal', $contractArticle),
                'reject' => $request->user()->can('reject', $contractArticle),
                'restore_version' => $request->user()->can('restoreVersion', $contractArticle),
            ],
        ]);
    }

    public function edit(Request $request, ContractArticle $contractArticle): InertiaResponse
    {
        $this->authorize('update', $contractArticle);

        $contractArticle->load(['currentVersion']);

        return Inertia::render('ContractArticles/Edit', [
            'article' => $contractArticle,
            'categories' => ContractArticle::CATEGORIES,
            'statuses' => ContractArticle::STATUSES,
            'allowedRiskTags' => ContractArticleVersion::RISK_TAGS,
        ]);
    }

    public function store(StoreContractArticleRequest $request): RedirectResponse
    {
        $this->authorize('create', ContractArticle::class);

        $validated = $request->validated();

        $articleData = [
            'code' => $validated['code'],
            'serial' => (int) $validated['serial'],
            'category' => $validated['category'],
            'status' => $validated['status'],
            'internal_notes' => $validated['internal_notes'] ?? null,
        ];

        $contentData = [
            'title_ar' => $validated['title_ar'],
            'title_en' => $validated['title_en'],
            'content_ar' => $validated['content_ar'],
            'content_en' => $validated['content_en'],
            'change_summary' => $validated['change_summary'] ?? null,
            'risk_tags' => $validated['risk_tags'] ?? null,
        ];

        /** @var \App\Models\User $user */
        $user = $request->user();

        $article = $this->versionService->createArticleWithVersion($articleData, $contentData, $user);

        $this->activityLogger->log(
            'contracts.article.created',
            $article,
            [],
            $article->toArray(),
            $user
        );

        $this->activityLogger->log(
            'contracts.article.version_created',
            $article->currentVersion,
            [],
            $article->currentVersion->toArray(),
            $user,
            [
                'contract_article_id' => (string) $article->id,
                'version_number' => $article->currentVersion->version_number,
            ]
        );

        return redirect()
            ->route('contract-articles.show', $article)
            ->with('success', 'Contract article created.');
    }

    public function update(UpdateContractArticleRequest $request, ContractArticle $contractArticle): RedirectResponse
    {
        $this->authorize('update', $contractArticle);

        $validated = $request->validated();

        $oldValues = $contractArticle->toArray();
        $oldStatus = $contractArticle->status;
        $oldCurrentVersionId = $contractArticle->current_version_id;

        $metadata = [
            'serial' => (int) $validated['serial'],
            'category' => $validated['category'],
            'status' => $validated['status'],
            'internal_notes' => $validated['internal_notes'] ?? null,
        ];

        $content = array_intersect_key(
            $validated,
            array_flip(['title_ar', 'title_en', 'content_ar', 'content_en', 'change_summary', 'risk_tags'])
        );

        /** @var \App\Models\User $user */
        $user = $request->user();

        $updatedArticle = $this->versionService->updateArticle(
            $contractArticle,
            $metadata,
            $content,
            $user
        );

        $newValues = $updatedArticle->toArray();

        // Article metadata update (includes possible status change)
        $this->activityLogger->log(
            'contracts.article.metadata_updated',
            $updatedArticle,
            $oldValues,
            $newValues,
            $user
        );

        // Explicit status change event if status changed
        if ($oldStatus !== $updatedArticle->status) {
            $this->activityLogger->log(
                'contracts.article.status_changed',
                $updatedArticle,
                ['status' => $oldStatus],
                ['status' => $updatedArticle->status],
                $user
            );
        }

        // New content version created
        if ($oldCurrentVersionId !== $updatedArticle->current_version_id && $updatedArticle->currentVersion !== null) {
            $this->activityLogger->log(
                'contracts.article.version_created',
                $updatedArticle->currentVersion,
                [],
                $updatedArticle->currentVersion->toArray(),
                $user,
                [
                    'contract_article_id' => (string) $updatedArticle->id,
                    'version_number' => $updatedArticle->currentVersion->version_number,
                ]
            );
        }

        return redirect()
            ->route('contract-articles.show', $updatedArticle)
            ->with('success', 'Contract article updated.');
    }

    public function compare(Request $request, ContractArticle $contractArticle): InertiaResponse
    {
        $this->authorize('view', $contractArticle);

        $contractArticle->load(['versions' => fn ($q) => $q->orderByDesc('version_number')]);

        $versions = $contractArticle->versions;

        $leftId = $request->input('left_version_id');
        $rightId = $request->input('right_version_id');

        if ($leftId === null || $rightId === null) {
            if ($versions->count() >= 2) {
                $right = $versions->first();
                $left = $versions->get(1);
            } else {
                $left = $versions->first();
                $right = null;
            }
        } else {
            $left = $versions->firstWhere('id', $leftId);
            $right = $versions->firstWhere('id', $rightId);
        }

        return Inertia::render('ContractArticles/Compare', [
            'article' => $contractArticle->only(['id', 'code', 'serial', 'category', 'status']),
            'versions' => $versions,
            'left' => $left,
            'right' => $right,
        ]);
    }

    public function archive(Request $request, ContractArticle $contractArticle): RedirectResponse
    {
        $this->authorize('update', $contractArticle);

        if ($contractArticle->isPendingApproval() && ! $request->user()->hasRole('super_admin')) {
            return back()->with('error', __('contract_articles.flash_cannot_edit_while_pending'));
        }

        $oldValues = $contractArticle->toArray();
        $oldStatus = $contractArticle->status;
        $oldCurrentVersionId = $contractArticle->current_version_id;

        /** @var \App\Models\User $user */
        $user = $request->user();

        $updatedArticle = $this->versionService->updateArticle(
            $contractArticle,
            [
                'serial' => $contractArticle->serial,
                'category' => $contractArticle->category,
                'status' => ContractArticle::STATUS_ARCHIVED,
                'internal_notes' => $contractArticle->internal_notes,
            ],
            [],
            $user
        );

        $newValues = $updatedArticle->toArray();

        $this->activityLogger->log(
            'contracts.article.metadata_updated',
            $updatedArticle,
            $oldValues,
            $newValues,
            $user
        );

        if ($oldStatus !== $updatedArticle->status) {
            $this->activityLogger->log(
                'contracts.article.status_changed',
                $updatedArticle,
                ['status' => $oldStatus],
                ['status' => $updatedArticle->status],
                $user
            );
        }

        if ($oldCurrentVersionId !== $updatedArticle->current_version_id && $updatedArticle->currentVersion !== null) {
            $this->activityLogger->log(
                'contracts.article.version_created',
                $updatedArticle->currentVersion,
                [],
                $updatedArticle->currentVersion->toArray(),
                $user,
                [
                    'contract_article_id' => (string) $updatedArticle->id,
                    'version_number' => $updatedArticle->currentVersion->version_number,
                ]
            );
        }

        return redirect()
            ->route('contract-articles.show', $updatedArticle)
            ->with('success', 'Contract article archived.');
    }

    public function activate(Request $request, ContractArticle $contractArticle): RedirectResponse
    {
        $this->authorize('update', $contractArticle);

        if ($contractArticle->isPendingApproval() && ! $request->user()->hasRole('super_admin')) {
            return back()->with('error', __('contract_articles.flash_cannot_edit_while_pending'));
        }

        $oldValues = $contractArticle->toArray();
        $oldStatus = $contractArticle->status;
        $oldCurrentVersionId = $contractArticle->current_version_id;

        /** @var \App\Models\User $user */
        $user = $request->user();

        $updatedArticle = $this->versionService->updateArticle(
            $contractArticle,
            [
                'serial' => $contractArticle->serial,
                'category' => $contractArticle->category,
                'status' => ContractArticle::STATUS_ACTIVE,
                'internal_notes' => $contractArticle->internal_notes,
            ],
            [],
            $user
        );

        $newValues = $updatedArticle->toArray();

        $this->activityLogger->log(
            'contracts.article.metadata_updated',
            $updatedArticle,
            $oldValues,
            $newValues,
            $user
        );

        if ($oldStatus !== $updatedArticle->status) {
            $this->activityLogger->log(
                'contracts.article.status_changed',
                $updatedArticle,
                ['status' => $oldStatus],
                ['status' => $updatedArticle->status],
                $user
            );
        }

        if ($oldCurrentVersionId !== $updatedArticle->current_version_id && $updatedArticle->currentVersion !== null) {
            $this->activityLogger->log(
                'contracts.article.version_created',
                $updatedArticle->currentVersion,
                [],
                $updatedArticle->currentVersion->toArray(),
                $user,
                [
                    'contract_article_id' => (string) $updatedArticle->id,
                    'version_number' => $updatedArticle->currentVersion->version_number,
                ]
            );
        }

        return redirect()
            ->route('contract-articles.show', $updatedArticle)
            ->with('success', 'Contract article reactivated.');
    }

    public function restore(
        RestoreContractArticleVersionRequest $request,
        ContractArticle $contractArticle,
        ContractArticleVersion $version
    ): RedirectResponse {
        $this->authorize('restoreVersion', $contractArticle);

        /** @var \App\Models\User $user */
        $user = $request->user();

        $newVersion = $this->versionService->restoreVersion(
            $contractArticle,
            $version,
            $user,
            $request->validated('change_summary')
        );

        $this->activityLogger->log(
            'contracts.article.version_restored',
            $newVersion,
            [],
            $newVersion->toArray(),
            $user,
            [
                'contract_article_id' => (string) $contractArticle->id,
                'restored_from_version' => $version->version_number,
                'new_version_number' => $newVersion->version_number,
            ]
        );

        return redirect()
            ->route('contract-articles.show', $contractArticle)
            ->with('success', 'Contract article version restored.');
    }

    public function submitForApproval(Request $request, ContractArticle $contractArticle): RedirectResponse
    {
        $this->authorize('submitForApproval', $contractArticle);

        try {
            $this->governanceService->submitArticle($contractArticle, $request->user());
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        $this->activityLogger->log(
            'contracts.article.submitted_for_approval',
            $contractArticle->fresh(),
            [],
            [],
            $request->user()
        );

        return back()->with('success', __('contract_articles.flash_submitted_for_approval'));
    }

    public function approveContracts(Request $request, ContractArticle $contractArticle): RedirectResponse
    {
        $this->authorize('approveContracts', $contractArticle);

        try {
            $this->governanceService->approveArticleContracts($contractArticle, $request->user());
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        $this->activityLogger->log(
            'contracts.article.contracts_manager_approved',
            $contractArticle->fresh(),
            [],
            [],
            $request->user()
        );

        return back()->with('success', __('contract_articles.flash_contracts_approved'));
    }

    public function approveLegal(Request $request, ContractArticle $contractArticle): RedirectResponse
    {
        $this->authorize('approveLegal', $contractArticle);

        try {
            $this->governanceService->approveArticleLegal($contractArticle, $request->user());
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        $this->activityLogger->log(
            'contracts.article.legal_approved',
            $contractArticle->fresh(),
            [],
            [],
            $request->user()
        );

        return back()->with('success', __('contract_articles.flash_legal_approved'));
    }

    public function reject(RejectContractLibraryRequest $request, ContractArticle $contractArticle): RedirectResponse
    {
        $this->authorize('reject', $contractArticle);

        try {
            $this->governanceService->rejectArticle(
                $contractArticle,
                $request->user(),
                $request->validated('rejection_reason')
            );
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        $this->activityLogger->log(
            'contracts.article.rejected',
            $contractArticle->fresh(),
            [],
            ['rejection_reason' => $request->validated('rejection_reason')],
            $request->user()
        );

        return back()->with('success', __('contract_articles.flash_rejected'));
    }
}

