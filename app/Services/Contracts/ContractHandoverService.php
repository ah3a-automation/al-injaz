<?php

declare(strict_types=1);

namespace App\Services\Contracts;

use App\Models\Contract;
use App\Models\ContractArticle;
use App\Models\ContractArticleVersion;
use App\Models\ContractDraftArticle;
use App\Models\ContractTemplate;
use App\Models\Rfq;
use App\Models\RfqAward;
use App\Models\User;
use App\Services\Procurement\ContractService;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use RuntimeException;

final class ContractHandoverService
{
    public function __construct(
        private readonly ContractService $contractService,
    ) {
    }

    /**
     * Create a contract draft from an RFQ award, optionally using a template and/or extra library articles.
     *
     * @param array<string, mixed> $metadataOverrides
     */
    public function createFromRfq(
        Rfq $rfq,
        RfqAward $award,
        User $actor,
        ?ContractTemplate $template,
        array $libraryArticleIds,
        array $metadataOverrides = []
    ): Contract {
        if ($rfq->id !== $award->rfq_id) {
            throw new RuntimeException('Award does not belong to the given RFQ.');
        }

        if ($rfq->status !== Rfq::STATUS_AWARDED) {
            throw new RuntimeException('Contract draft can only be created when RFQ status is awarded.');
        }

        return DB::transaction(function () use ($rfq, $award, $actor, $template, $libraryArticleIds, $metadataOverrides): Contract {
            $rfq = Rfq::where('id', $rfq->id)->lockForUpdate()->firstOrFail();

            if (! $rfq->award()->exists()) {
                throw new RuntimeException('RFQ must have an award before creating a contract draft.');
            }

            if ($rfq->contract()->exists()) {
                throw new RuntimeException('RFQ already has a contract. Duplicate contracts are not allowed.');
            }

            // Use existing ContractService to preserve legacy behavior for header + RFQ status/outbox
            $contract = $this->contractService->createFromAward($rfq, $award, $actor);

            // Enrich header with Phase 4 fields
            $contract->fill([
                'title_en'           => $metadataOverrides['title_en'] ?? $contract->title_en,
                'title_ar'           => $metadataOverrides['title_ar'] ?? $contract->title_ar,
                'description'        => $metadataOverrides['description'] ?? $contract->description,
                'internal_notes'     => $metadataOverrides['internal_notes'] ?? $contract->internal_notes,
                'start_date'         => $metadataOverrides['start_date'] ?? $contract->start_date,
                'end_date'           => $metadataOverrides['end_date'] ?? $contract->end_date,
                'contract_template_id' => $template?->id,
            ]);
            $contract->save();

            $sortOrder = 1;

            if ($template !== null) {
                $sortOrder = $this->importTemplateArticles($contract, $template, $actor, $sortOrder);
            }

            if ($libraryArticleIds !== []) {
                $this->importLibraryArticles($contract, $libraryArticleIds, $actor, $sortOrder);
            }

            return $contract->load(['draftArticles']);
        });
    }

    /**
     * Import ordered template items into draft-local articles.
     */
    public function importTemplateArticles(
        Contract $contract,
        ContractTemplate $template,
        User $actor,
        int $startingOrder = 1
    ): int {
        $template->loadMissing(['items.article.currentVersion']);

        /** @var Collection<int, \App\Models\ContractTemplateItem> $items */
        $items = $template->items()->orderBy('sort_order')->get();

        $order = $startingOrder;

        foreach ($items as $item) {
            $article = $item->article;
            $version = $article?->currentVersion;

            if ($article === null || $version === null) {
                continue;
            }

            $this->createDraftArticleFromVersion(
                $contract,
                $article,
                $version,
                ContractDraftArticle::ORIGIN_TEMPLATE,
                $order,
                [
                    'source_template_id' => $template->id,
                    'source_template_item_id' => $item->id,
                ]
            );

            $order++;
        }

        return $order;
    }

    /**
     * Import selected library articles into draft-local articles.
     *
     * @param array<int, string> $articleIds
     */
    public function importLibraryArticles(
        Contract $contract,
        array $articleIds,
        User $actor,
        int $startingOrder = 1
    ): int {
        if ($articleIds === []) {
            return $startingOrder;
        }

        /** @var Collection<int, ContractArticle> $articles */
        $articles = ContractArticle::query()
            ->with('currentVersion')
            ->whereIn('id', $articleIds)
            ->get()
            ->keyBy('id');

        $order = $startingOrder;

        foreach ($articleIds as $articleId) {
            /** @var ContractArticle|null $article */
            $article = $articles->get($articleId);
            $version = $article?->currentVersion;

            if ($article === null || $version === null) {
                continue;
            }

            $this->createDraftArticleFromVersion(
                $contract,
                $article,
                $version,
                ContractDraftArticle::ORIGIN_LIBRARY,
                $order,
                []
            );

            $order++;
        }

        return $order;
    }

    /**
     * Create a draft-local snapshot row from a master article version.
     *
     * @param array<string, mixed> $extra
     */
    private function createDraftArticleFromVersion(
        Contract $contract,
        ContractArticle $article,
        ContractArticleVersion $version,
        string $originType,
        int $sortOrder,
        array $extra
    ): ContractDraftArticle {
        /** @var ContractDraftArticle $draft */
        $draft = new ContractDraftArticle();
        $draft->fill(array_merge([
            'contract_id'                      => $contract->id,
            'sort_order'                       => $sortOrder,
            'source_contract_article_id'       => $article->id,
            'source_contract_article_version_id' => $version->id,
            'article_code'                     => $article->code,
            'title_ar'                         => $version->title_ar,
            'title_en'                         => $version->title_en,
            'content_ar'                       => $version->content_ar,
            'content_en'                       => $version->content_en,
            'origin_type'                      => $originType,
            'is_modified'                      => false,
        ], $extra));

        $draft->save();

        return $draft;
    }
}

