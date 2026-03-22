<?php

declare(strict_types=1);

namespace App\Services\Contracts;

use App\Models\Contract;
use App\Models\ContractArticle;
use App\Models\ContractDraftArticle;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use RuntimeException;

final class ContractDraftWorkspaceService
{
    public function __construct(
        private readonly ContractArticleBlockComposer $blockComposer,
    ) {
    }

    public function updateHeader(Contract $contract, array $data, User $actor): Contract
    {
        $contract->fill([
            'title_en' => $data['title_en'] ?? $contract->title_en,
            'title_ar' => $data['title_ar'] ?? $contract->title_ar,
            'description' => $data['description'] ?? $contract->description,
            'internal_notes' => $data['internal_notes'] ?? $contract->internal_notes,
            'start_date' => $data['start_date'] ?? $contract->start_date,
            'end_date' => $data['end_date'] ?? $contract->end_date,
            'updated_by_user_id' => $actor->id,
        ]);

        $contract->save();

        return $contract;
    }

    public function updateStatus(Contract $contract, string $newStatus, User $actor): Contract
    {
        if (! $contract->canPreparationTransitionTo($newStatus)) {
            throw new RuntimeException('Invalid status transition for contract draft.');
        }

        $contract->status = $newStatus;
        $contract->updated_by_user_id = $actor->id;
        $contract->save();

        return $contract;
    }

    public function addLibraryArticle(Contract $contract, string $articleId, User $actor): ContractDraftArticle
    {
        /** @var ContractArticle|null $article */
        $article = ContractArticle::query()
            ->with('currentVersion')
            ->where('status', ContractArticle::STATUS_ACTIVE)
            ->find($articleId);

        if ($article === null || $article->currentVersion === null) {
            throw new RuntimeException('Selected article is not available.');
        }

        $maxOrder = (int) $contract->draftArticles()->max('sort_order');
        $sortOrder = $maxOrder + 1;

        $version = $article->currentVersion;

        $draft = new ContractDraftArticle();
        $blocks = $version->blocks;
        $normalizedBlocks = null;
        if (is_array($blocks) && $blocks !== []) {
            $json = json_encode($blocks);
            if ($json === false) {
                throw new RuntimeException('Failed to encode blocks for draft copy.');
            }
            $decoded = json_decode($json, true);
            if (! is_array($decoded)) {
                throw new RuntimeException('Failed to decode blocks for draft copy.');
            }
            /** @var array<int, array<string, mixed>> $copied */
            $copied = $decoded;
            $normalizedBlocks = $this->blockComposer->applyDefaultSelectedOptionsForDraft($copied);
        }

        $draft->fill([
            'contract_id' => $contract->id,
            'sort_order' => $sortOrder,
            'source_contract_article_id' => $article->id,
            'source_contract_article_version_id' => $version->id,
            'article_code' => $article->code,
            'title_ar' => $version->title_ar,
            'title_en' => $version->title_en,
            'content_ar' => $version->content_ar,
            'content_en' => $version->content_en,
            'blocks' => $normalizedBlocks,
            'origin_type' => ContractDraftArticle::ORIGIN_LIBRARY,
            'is_modified' => false,
            'updated_by_user_id' => $actor->id,
        ]);
        $draft->save();

        return $draft;
    }

    public function updateDraftArticle(
        Contract $contract,
        ContractDraftArticle $draftArticle,
        array $data,
        User $actor
    ): ContractDraftArticle {
        if ($draftArticle->contract_id !== $contract->id) {
            throw new RuntimeException('Draft article does not belong to this contract.');
        }

        $original = $draftArticle->only(['title_en', 'title_ar', 'content_en', 'content_ar']);

        $draftArticle->fill([
            'title_en' => $data['title_en'] ?? $draftArticle->title_en,
            'title_ar' => $data['title_ar'] ?? $draftArticle->title_ar,
            'content_en' => $data['content_en'] ?? $draftArticle->content_en,
            'content_ar' => $data['content_ar'] ?? $draftArticle->content_ar,
        ]);

        $changed =
            $draftArticle->title_en !== $original['title_en']
            || $draftArticle->title_ar !== $original['title_ar']
            || $draftArticle->content_en !== $original['content_en']
            || $draftArticle->content_ar !== $original['content_ar'];

        if ($changed) {
            $draftArticle->is_modified = true;
            $draftArticle->updated_by_user_id = $actor->id;
            $draftArticle->last_edited_at = now();
            $draftArticle->save();
        }

        return $draftArticle;
    }

    public function removeDraftArticle(Contract $contract, ContractDraftArticle $draftArticle): void
    {
        if ($draftArticle->contract_id !== $contract->id) {
            throw new RuntimeException('Draft article does not belong to this contract.');
        }

        DB::transaction(function () use ($contract, $draftArticle): void {
            $draftArticle->delete();

            $this->normalizeSortOrder($contract);
        });
    }

    /**
       * @param array<int, string> $orderedIds
       */
    public function reorderDraftArticles(Contract $contract, array $orderedIds): void
    {
        if ($orderedIds === []) {
            return;
        }

        /** @var array<string, ContractDraftArticle> $articles */
        $articles = $contract->draftArticles()
            ->get()
            ->keyBy('id')
            ->all();

        foreach ($orderedIds as $id) {
            if (! isset($articles[$id])) {
                throw new RuntimeException('Invalid draft article id in ordering payload.');
            }
        }

        $order = 1;
        foreach ($orderedIds as $id) {
            $article = $articles[$id];
            if ($article->sort_order !== $order) {
                $article->sort_order = $order;
                $article->save();
            }
            $order++;
        }
    }

    private function normalizeSortOrder(Contract $contract): void
    {
        $articles = $contract->draftArticles()
            ->orderBy('sort_order')
            ->get();

        $order = 1;
        foreach ($articles as $article) {
            if ($article->sort_order !== $order) {
                $article->sort_order = $order;
                $article->save();
            }
            $order++;
        }
    }
}

