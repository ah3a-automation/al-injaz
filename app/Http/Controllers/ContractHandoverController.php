<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Contracts\StoreContractFromRfqRequest;
use App\Models\Contract;
use App\Models\ContractArticle;
use App\Models\ContractTemplate;
use App\Models\Rfq;
use App\Models\RfqAward;
use App\Services\ActivityLogger;
use App\Services\Contracts\ContractHandoverService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use RuntimeException;

final class ContractHandoverController extends Controller
{
    public function __construct(
        private readonly ActivityLogger $activityLogger,
        private readonly ContractHandoverService $handoverService,
    ) {
    }

    public function createFromRfqForm(Request $request, Rfq $rfq): InertiaResponse|RedirectResponse
    {
        $this->authorize('view', $rfq);

        if ($rfq->status !== Rfq::STATUS_AWARDED) {
            return redirect()
                ->route('rfqs.show', $rfq)
                ->with('error', 'RFQ must be in awarded status before creating a contract draft.');
        }

        /** @var RfqAward|null $award */
        $award = $rfq->award;

        if (! $award) {
            return redirect()
                ->route('rfqs.show', $rfq)
                ->with('error', 'RFQ has no award. Create an award before creating a contract draft.');
        }

        if ($rfq->contract()->exists()) {
            return redirect()
                ->route('rfqs.show', $rfq)
                ->with('error', 'RFQ already has a contract draft.');
        }

        $rfq->load(['project:id,name,name_en,code', 'procurementPackage:id,package_no,name', 'award.supplier:id,legal_name_en,supplier_code']);

        $templates = ContractTemplate::query()
            ->where('status', ContractTemplate::STATUS_ACTIVE)
            ->orderBy('code')
            ->get(['id', 'code', 'name_en', 'name_ar', 'template_type', 'status']);

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

        return Inertia::render('Contracts/CreateFromRfq', [
            'rfq' => [
                'id' => (string) $rfq->id,
                'rfq_number' => $rfq->rfq_number,
                'title' => $rfq->title,
                'status' => $rfq->status,
                'currency' => $rfq->currency,
            ],
            'award' => [
                'id' => (string) $award->id,
                'awarded_amount' => (string) $award->awarded_amount,
                'currency' => $award->currency,
                'award_note' => $award->award_note,
                'supplier' => $award->supplier ? [
                    'id' => (string) $award->supplier->id,
                    'legal_name_en' => $award->supplier->legal_name_en,
                    'supplier_code' => $award->supplier->supplier_code,
                ] : null,
            ],
            'project' => $rfq->project ? $rfq->project->only(['id', 'name', 'name_en', 'code']) : null,
            'package' => $rfq->procurementPackage ? $rfq->procurementPackage->only(['id', 'package_no', 'name']) : null,
            'templates' => $templates,
            'articles' => $articles,
        ]);
    }

    public function storeFromRfq(StoreContractFromRfqRequest $request, Rfq $rfq): RedirectResponse
    {
        /** @var RfqAward|null $award */
        $award = $rfq->award;

        if (! $award) {
            return redirect()
                ->route('rfqs.show', $rfq)
                ->with('error', 'RFQ has no award. Create an award before creating a contract draft.');
        }

        $validated = $request->validated();

        /** @var \App\Models\User $user */
        $user = $request->user();

        $template = null;
        if (! empty($validated['contract_template_id'])) {
            /** @var ContractTemplate|null $template */
            $template = ContractTemplate::query()
                ->where('status', ContractTemplate::STATUS_ACTIVE)
                ->find($validated['contract_template_id']);
        }

        $articleIds = isset($validated['article_ids']) ? (array) $validated['article_ids'] : [];

        try {
            $contract = $this->handoverService->createFromRfq(
                $rfq,
                $award,
                $user,
                $template,
                $articleIds,
                [
                    'title_en' => $validated['title_en'] ?? null,
                    'title_ar' => $validated['title_ar'] ?? null,
                    'description' => $validated['description'] ?? null,
                    'internal_notes' => $validated['internal_notes'] ?? null,
                    'start_date' => $validated['start_date'] ?? null,
                    'end_date' => $validated['end_date'] ?? null,
                ]
            );
        } catch (RuntimeException $e) {
            return redirect()
                ->route('rfqs.show', $rfq)
                ->with('error', $e->getMessage());
        }

        $this->activityLogger->log(
            'contracts.contract.created',
            $contract,
            [],
            $contract->toArray(),
            $user
        );

        $this->activityLogger->log(
            'contracts.contract.handover_from_rfq',
            $contract,
            [],
            [
                'rfq_id' => (string) $rfq->id,
                'rfq_status' => $rfq->status,
                'award_id' => (string) $award->id,
                'supplier_id' => (string) $award->supplier_id,
                'contract_id' => (string) $contract->id,
                'template_id' => $template?->id,
                'article_ids_count' => count($articleIds),
            ],
            $user
        );

        if ($template !== null || $articleIds !== []) {
            $this->activityLogger->log(
                'contracts.contract.articles_imported',
                $contract,
                [],
                [
                    'template_id' => $template?->id,
                    'template_used' => $template !== null,
                    'library_article_ids_count' => count($articleIds),
                ],
                $user
            );
        }

        if ($contract->status !== Contract::STATUS_DRAFT) {
            $this->activityLogger->log(
                'contracts.contract.status_changed',
                $contract,
                ['status' => Contract::STATUS_DRAFT],
                ['status' => $contract->status],
                $user
            );
        }

        return redirect()
            ->route('contracts.show', $contract)
            ->with('success', 'Contract draft created from RFQ.');
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

