<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Contracts\RestoreContractArticleVersionRequest;
use App\Http\Requests\Contracts\StoreContractArticleRequest;
use App\Http\Requests\Contracts\UpdateContractArticleRequest;
use App\Models\ContractArticle;
use App\Models\ContractArticleVersion;
use App\Services\ActivityLogger;
use App\Services\Contracts\ContractArticleVersionService;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

final class ContractArticleController extends Controller
{
    public function __construct(
        private readonly ActivityLogger $activityLogger,
        private readonly ContractArticleVersionService $versionService,
    ) {
    }

    public function index(Request $request): InertiaResponse
    {
        $this->authorize('viewAny', ContractArticle::class);

        $query = ContractArticle::query()
            ->with('currentVersion')
            ->when($request->filled('category'), fn ($q) => $q->where('category', (string) $request->input('category')))
            ->when($request->filled('status'), fn ($q) => $q->where('status', (string) $request->input('status')))
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
                'per_page' => $request->input('per_page', 25),
            ],
            'categories' => ContractArticle::CATEGORIES,
            'statuses' => ContractArticle::STATUSES,
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
        ]);

        return Inertia::render('ContractArticles/Show', [
            'article' => $contractArticle,
            'can' => [
                'update' => $request->user()->can('update', $contractArticle),
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
            array_flip(['title_ar', 'title_en', 'content_ar', 'content_en', 'change_summary'])
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
        $this->authorize('update', $contractArticle);

        /** @var \App\Models\User $user */
        $user = $request->user();

        $newVersion = $this->versionService->restoreVersion(
            $contractArticle,
            $version,
            $user,
            $request->validated('change_summary')
        );

        $this->activityLogger->log(
            'contracts.article.restored',
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
}

