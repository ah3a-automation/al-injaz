<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Contracts\RejectContractLibraryRequest;
use App\Http\Requests\Contracts\StoreContractTemplateRequest;
use App\Http\Requests\Contracts\UpdateContractTemplateRequest;
use App\Models\ContractArticle;
use App\Models\ContractTemplate;
use App\Models\ContractTemplateVersion;
use App\Services\ActivityLogger;
use App\Services\Contracts\ContractLibraryGovernanceService;
use App\Services\Contracts\ContractTemplateService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

final class ContractTemplateController extends Controller
{
    public function __construct(
        private readonly ActivityLogger $activityLogger,
        private readonly ContractTemplateService $templateService,
        private readonly ContractLibraryGovernanceService $governanceService,
    ) {
    }

    public function index(Request $request): InertiaResponse
    {
        $this->authorize('viewAny', ContractTemplate::class);

        $query = ContractTemplate::query()
            ->when($request->filled('template_type'), fn ($q) => $q->where('template_type', (string) $request->input('template_type')))
            ->when($request->filled('status'), fn ($q) => $q->where('status', (string) $request->input('status')))
            ->when($request->filled('approval_status'), fn ($q) => $q->where('approval_status', (string) $request->input('approval_status')))
            ->when($request->filled('q'), function ($q) use ($request) {
                $term = (string) $request->input('q');

                $q->where(function ($sub) use ($term) {
                    $sub->where('code', 'ilike', "%{$term}%")
                        ->orWhere('name_en', 'ilike', "%{$term}%")
                        ->orWhere('name_ar', 'ilike', "%{$term}%");
                });
            })
            ->orderBy('code');

        $templates = $query->paginate((int) $request->input('per_page', 25))->withQueryString();

        return Inertia::render('ContractTemplates/Index', [
            'templates' => $templates,
            'filters' => [
                'q' => $request->input('q'),
                'template_type' => $request->input('template_type'),
                'status' => $request->input('status'),
                'approval_status' => $request->input('approval_status'),
                'per_page' => $request->input('per_page', 25),
            ],
            'templateTypes' => ContractTemplate::TEMPLATE_TYPES,
            'statuses' => ContractTemplate::STATUSES,
            'approvalStatuses' => ContractTemplate::APPROVAL_STATUSES,
            'can' => [
                'create' => $request->user()->can('create', ContractTemplate::class),
                'manage' => $request->user()->can('contract.manage'),
            ],
        ]);
    }

    public function create(Request $request): InertiaResponse
    {
        $this->authorize('create', ContractTemplate::class);

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
                'status' => $article->status,
                'title_en' => $article->currentVersion?->title_en,
                'title_ar' => $article->currentVersion?->title_ar,
                'snippet_en' => $this->makeSnippet($article->currentVersion?->content_en),
                'snippet_ar' => $this->makeSnippet($article->currentVersion?->content_ar),
            ]);

        return Inertia::render('ContractTemplates/Create', [
            'templateTypes' => ContractTemplate::TEMPLATE_TYPES,
            'statuses' => ContractTemplate::STATUSES,
            'articles' => $articles,
        ]);
    }

    public function store(StoreContractTemplateRequest $request): RedirectResponse
    {
        $this->authorize('create', ContractTemplate::class);

        $validated = $request->validated();

        /** @var \App\Models\User $user */
        $user = $request->user();

        $template = $this->templateService->createTemplate(
            [
                'code' => $validated['code'],
                'name_en' => $validated['name_en'],
                'name_ar' => $validated['name_ar'],
                'template_type' => $validated['template_type'],
                'status' => $validated['status'],
                'description' => $validated['description'] ?? null,
                'internal_notes' => $validated['internal_notes'] ?? null,
            ],
            $validated['article_ids'],
            $user
        );

        $this->activityLogger->log(
            'contracts.template.created',
            $template,
            [],
            $template->toArray(),
            $user
        );

        $this->activityLogger->log(
            'contracts.template.items_synced',
            $template,
            ['article_ids' => []],
            ['article_ids' => $validated['article_ids']],
            $user
        );

        return redirect()
            ->route('contract-templates.show', $template)
            ->with('success', 'Contract template created.');
    }

    public function show(Request $request, ContractTemplate $contractTemplate): InertiaResponse
    {
        $this->authorize('view', $contractTemplate);

        $contractTemplate->load([
            'items.article.currentVersion',
            'createdBy:id,name',
            'updatedBy:id,name',
            'submittedBy:id,name',
            'contractsManagerApprovedBy:id,name',
            'legalApprovedBy:id,name',
            'templateVersions' => fn ($q) => $q->orderByDesc('version_number')->with('createdBy:id,name'),
            'currentTemplateVersion',
        ]);

        $previewItems = $contractTemplate->items->map(function ($item) {
            /** @var \App\Models\ContractTemplateItem $item */
            $article = $item->article;
            $version = $article?->currentVersion;

            return [
                'id' => (string) $item->id,
                'sort_order' => $item->sort_order,
                'article_id' => $article?->id,
                'article_code' => $article?->code,
                'title_en' => $version?->title_en,
                'title_ar' => $version?->title_ar,
                'snippet_en' => $this->makeSnippet($version?->content_en),
                'snippet_ar' => $this->makeSnippet($version?->content_ar),
            ];
        });

        return Inertia::render('ContractTemplates/Show', [
            'template' => [
                'id' => (string) $contractTemplate->id,
                'code' => $contractTemplate->code,
                'name_en' => $contractTemplate->name_en,
                'name_ar' => $contractTemplate->name_ar,
                'template_type' => $contractTemplate->template_type,
                'status' => $contractTemplate->status,
                'approval_status' => $contractTemplate->approval_status ?? ContractTemplate::APPROVAL_NONE,
                'description' => $contractTemplate->description,
                'internal_notes' => $contractTemplate->internal_notes,
                'rejection_reason' => $contractTemplate->rejection_reason,
                'submitted_at' => $contractTemplate->submitted_at?->toIso8601String(),
                'contracts_manager_approved_at' => $contractTemplate->contracts_manager_approved_at?->toIso8601String(),
                'legal_approved_at' => $contractTemplate->legal_approved_at?->toIso8601String(),
                'created_by' => $contractTemplate->createdBy?->only(['id', 'name']),
                'updated_by' => $contractTemplate->updatedBy?->only(['id', 'name']),
                'submitted_by' => $contractTemplate->submittedBy?->only(['id', 'name']),
                'contracts_manager_approved_by' => $contractTemplate->contractsManagerApprovedBy?->only(['id', 'name']),
                'legal_approved_by' => $contractTemplate->legalApprovedBy?->only(['id', 'name']),
                'current_template_version_id' => $contractTemplate->current_template_version_id,
            ],
            'template_versions' => $contractTemplate->templateVersions->map(fn (ContractTemplateVersion $v) => [
                'id' => (string) $v->id,
                'version_number' => $v->version_number,
                'name_en' => $v->name_en,
                'created_at' => $v->created_at?->toIso8601String(),
                'created_by' => $v->createdBy?->only(['id', 'name']),
            ])->values()->all(),
            'items' => $previewItems,
            'can' => [
                'update' => $request->user()->can('update', $contractTemplate),
                'submit_for_approval' => $request->user()->can('submitForApproval', $contractTemplate),
                'approve_contracts' => $request->user()->can('approveContracts', $contractTemplate),
                'approve_legal' => $request->user()->can('approveLegal', $contractTemplate),
                'reject' => $request->user()->can('reject', $contractTemplate),
                'restore_template_version' => $request->user()->can('restoreTemplateVersion', $contractTemplate),
            ],
        ]);
    }

    public function edit(Request $request, ContractTemplate $contractTemplate): InertiaResponse
    {
        $this->authorize('update', $contractTemplate);

        $contractTemplate->load(['items.article.currentVersion']);

        $selectedArticleIds = $contractTemplate->items->sortBy('sort_order')->pluck('contract_article_id')->values();

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
                'status' => $article->status,
                'title_en' => $article->currentVersion?->title_en,
                'title_ar' => $article->currentVersion?->title_ar,
                'snippet_en' => $this->makeSnippet($article->currentVersion?->content_en),
                'snippet_ar' => $this->makeSnippet($article->currentVersion?->content_ar),
            ]);

        return Inertia::render('ContractTemplates/Edit', [
            'template' => $contractTemplate,
            'templateTypes' => ContractTemplate::TEMPLATE_TYPES,
            'statuses' => ContractTemplate::STATUSES,
            'articles' => $articles,
            'selectedArticleIds' => $selectedArticleIds,
        ]);
    }

    public function update(UpdateContractTemplateRequest $request, ContractTemplate $contractTemplate): RedirectResponse
    {
        $this->authorize('update', $contractTemplate);

        $validated = $request->validated();

        /** @var \App\Models\User $user */
        $user = $request->user();

        $oldValues = $contractTemplate->toArray();
        $oldStatus = $contractTemplate->status;

        $oldArticleIds = $contractTemplate->items()
            ->orderBy('sort_order')
            ->pluck('contract_article_id')
            ->map(static fn ($id): string => (string) $id)
            ->all();

        $articleIds = array_key_exists('article_ids', $validated)
            ? (array) $validated['article_ids']
            : null;

        $updatedTemplate = $this->templateService->updateTemplate(
            [
                'name_en' => $validated['name_en'],
                'name_ar' => $validated['name_ar'],
                'template_type' => $validated['template_type'],
                'status' => $validated['status'],
                'description' => $validated['description'] ?? null,
                'internal_notes' => $validated['internal_notes'] ?? null,
            ],
            $articleIds,
            $user
        );

        $newValues = $updatedTemplate->toArray();

        $this->activityLogger->log(
            'contracts.template.updated',
            $updatedTemplate,
            $oldValues,
            $newValues,
            $user
        );

        if ($articleIds !== null) {
            $newArticleIds = $updatedTemplate->items()
                ->orderBy('sort_order')
                ->pluck('contract_article_id')
                ->map(static fn ($id): string => (string) $id)
                ->all();

            if ($newArticleIds !== $oldArticleIds) {
                $this->activityLogger->log(
                    'contracts.template.items_synced',
                    $updatedTemplate,
                    ['article_ids' => $oldArticleIds],
                    ['article_ids' => $newArticleIds],
                    $user
                );

                $oldSorted = $oldArticleIds;
                $newSorted = $newArticleIds;
                sort($oldSorted);
                sort($newSorted);

                if ($oldSorted === $newSorted) {
                    $this->activityLogger->log(
                        'contracts.template.reordered',
                        $updatedTemplate,
                        ['article_ids' => $oldArticleIds],
                        ['article_ids' => $newArticleIds],
                        $user
                    );
                }
            }
        }

        if ($oldStatus !== $updatedTemplate->status) {
            $this->activityLogger->log(
                'contracts.template.status_changed',
                $updatedTemplate,
                ['status' => $oldStatus],
                ['status' => $updatedTemplate->status],
                $user
            );
        }

        return redirect()
            ->route('contract-templates.show', $updatedTemplate)
            ->with('success', 'Contract template updated.');
    }

    public function archive(Request $request, ContractTemplate $contractTemplate): RedirectResponse
    {
        $this->authorize('update', $contractTemplate);

        if ($contractTemplate->isPendingApproval() && ! $request->user()->hasRole('super_admin')) {
            return back()->with('error', __('contract_templates.flash_cannot_edit_while_pending'));
        }

        /** @var \App\Models\User $user */
        $user = $request->user();

        $oldValues = $contractTemplate->toArray();
        $oldStatus = $contractTemplate->status;

        $updatedTemplate = $this->templateService->updateTemplate(
            [
                'name_en' => $contractTemplate->name_en,
                'name_ar' => $contractTemplate->name_ar,
                'template_type' => $contractTemplate->template_type,
                'status' => ContractTemplate::STATUS_ARCHIVED,
                'description' => $contractTemplate->description,
                'internal_notes' => $contractTemplate->internal_notes,
            ],
            null,
            $user
        );

        $newValues = $updatedTemplate->toArray();

        $this->activityLogger->log(
            'contracts.template.updated',
            $updatedTemplate,
            $oldValues,
            $newValues,
            $user
        );

        if ($oldStatus !== $updatedTemplate->status) {
            $this->activityLogger->log(
                'contracts.template.status_changed',
                $updatedTemplate,
                ['status' => $oldStatus],
                ['status' => $updatedTemplate->status],
                $user
            );
        }

        return redirect()
            ->route('contract-templates.show', $updatedTemplate)
            ->with('success', 'Contract template archived.');
    }

    public function activate(Request $request, ContractTemplate $contractTemplate): RedirectResponse
    {
        $this->authorize('update', $contractTemplate);

        if ($contractTemplate->isPendingApproval() && ! $request->user()->hasRole('super_admin')) {
            return back()->with('error', __('contract_templates.flash_cannot_edit_while_pending'));
        }

        /** @var \App\Models\User $user */
        $user = $request->user();

        $oldValues = $contractTemplate->toArray();
        $oldStatus = $contractTemplate->status;

        $updatedTemplate = $this->templateService->updateTemplate(
            [
                'name_en' => $contractTemplate->name_en,
                'name_ar' => $contractTemplate->name_ar,
                'template_type' => $contractTemplate->template_type,
                'status' => ContractTemplate::STATUS_ACTIVE,
                'description' => $contractTemplate->description,
                'internal_notes' => $contractTemplate->internal_notes,
            ],
            null,
            $user
        );

        $newValues = $updatedTemplate->toArray();

        $this->activityLogger->log(
            'contracts.template.updated',
            $updatedTemplate,
            $oldValues,
            $newValues,
            $user
        );

        if ($oldStatus !== $updatedTemplate->status) {
            $this->activityLogger->log(
                'contracts.template.status_changed',
                $updatedTemplate,
                ['status' => $oldStatus],
                ['status' => $updatedTemplate->status],
                $user
            );
        }

        return redirect()
            ->route('contract-templates.show', $updatedTemplate)
            ->with('success', 'Contract template reactivated.');
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

    public function submitForApproval(Request $request, ContractTemplate $contractTemplate): RedirectResponse
    {
        $this->authorize('submitForApproval', $contractTemplate);

        try {
            $this->governanceService->submitTemplate($contractTemplate, $request->user());
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        $this->activityLogger->log(
            'contracts.template.submitted_for_approval',
            $contractTemplate->fresh(),
            [],
            [],
            $request->user()
        );

        return back()->with('success', __('contract_templates.flash_submitted_for_approval'));
    }

    public function approveContracts(Request $request, ContractTemplate $contractTemplate): RedirectResponse
    {
        $this->authorize('approveContracts', $contractTemplate);

        try {
            $this->governanceService->approveTemplateContracts($contractTemplate, $request->user());
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        $this->activityLogger->log(
            'contracts.template.contracts_manager_approved',
            $contractTemplate->fresh(),
            [],
            [],
            $request->user()
        );

        return back()->with('success', __('contract_templates.flash_contracts_approved'));
    }

    public function approveLegal(Request $request, ContractTemplate $contractTemplate): RedirectResponse
    {
        $this->authorize('approveLegal', $contractTemplate);

        try {
            $this->governanceService->approveTemplateLegal($contractTemplate, $request->user());
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        $this->activityLogger->log(
            'contracts.template.legal_approved',
            $contractTemplate->fresh(),
            [],
            [],
            $request->user()
        );

        return back()->with('success', __('contract_templates.flash_legal_approved'));
    }

    public function reject(RejectContractLibraryRequest $request, ContractTemplate $contractTemplate): RedirectResponse
    {
        $this->authorize('reject', $contractTemplate);

        try {
            $this->governanceService->rejectTemplate(
                $contractTemplate,
                $request->user(),
                $request->validated('rejection_reason')
            );
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        $this->activityLogger->log(
            'contracts.template.rejected',
            $contractTemplate->fresh(),
            [],
            ['rejection_reason' => $request->validated('rejection_reason')],
            $request->user()
        );

        return back()->with('success', __('contract_templates.flash_rejected'));
    }

    public function restoreVersion(
        Request $request,
        ContractTemplate $contractTemplate,
        ContractTemplateVersion $contract_template_version
    ): RedirectResponse {
        $this->authorize('restoreTemplateVersion', $contractTemplate);

        if ((string) $contract_template_version->contract_template_id !== (string) $contractTemplate->id) {
            abort(404);
        }

        $updated = $this->governanceService->restoreTemplateFromVersion(
            $contractTemplate,
            $contract_template_version,
            $request->user()
        );

        $this->activityLogger->log(
            'contracts.template.restored_from_version',
            $updated,
            [],
            [
                'restored_from_version_id' => (string) $contract_template_version->id,
                'new_current_version_id' => (string) $updated->current_template_version_id,
            ],
            $request->user()
        );

        return redirect()
            ->route('contract-templates.show', $updated)
            ->with('success', __('contract_templates.flash_restored_from_version'));
    }
}

