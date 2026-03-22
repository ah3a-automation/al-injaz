<?php

declare(strict_types=1);

namespace App\Services\Contracts;

use App\Models\Contract;
use App\Models\ContractDraftArticle;

/**
 * Renders one or all draft articles for a contract and persists rendering metadata.
 */
final class ContractDraftRenderingService
{
    public function __construct(
        private readonly ContractArticleRenderer $renderer,
    ) {
    }

    /**
     * Render one draft article (content_en and content_ar), update model with results.
     */
    public function renderOne(ContractDraftArticle $draftArticle): ContractDraftArticle
    {
        $contract = $draftArticle->contract;
        if (! $contract instanceof Contract) {
            $contract = Contract::query()->find($draftArticle->contract_id);
        }
        if ($contract === null) {
            return $draftArticle;
        }

        $currency = $contract->currency ?? 'SAR';

        $blocks = $draftArticle->blocks;
        if (is_array($blocks) && $blocks !== []) {
            $resultEn = $this->renderer->renderBlocks($blocks, 'en', $contract, false, $currency);
            $resultAr = $this->renderer->renderBlocks($blocks, 'ar', $contract, false, $currency);
        } else {
            $contentEn = $draftArticle->content_en ?? '';
            $contentAr = $draftArticle->content_ar ?? '';
            $resultEn = $this->renderer->render($contentEn, $contract, $currency);
            $resultAr = $this->renderer->render($contentAr, $contract, $currency);
        }

        $usedKeys = array_values(array_unique(array_merge($resultEn['used_variable_keys'], $resultAr['used_variable_keys'])));
        $unresolvedKeys = array_values(array_unique(array_merge($resultEn['unresolved_variable_keys'], $resultAr['unresolved_variable_keys'])));

        $draftArticle->rendered_content_en = $resultEn['rendered_content'];
        $draftArticle->rendered_content_ar = $resultAr['rendered_content'];
        $draftArticle->used_variable_keys = $usedKeys;
        $draftArticle->unresolved_variable_keys = $unresolvedKeys;
        $draftArticle->last_rendered_at = now();
        $draftArticle->save();

        return $draftArticle;
    }

    /**
     * Render all draft articles for the contract and persist metadata.
     *
     * @return array<int, ContractDraftArticle>
     */
    public function renderAll(Contract $contract): array
    {
        $contract->load('draftArticles');
        $articles = [];
        foreach ($contract->draftArticles as $article) {
            $articles[] = $this->renderOne($article);
        }

        return $articles;
    }

    /**
     * Get aggregated unresolved variable keys across all draft articles.
     *
     * @return array<string>
     */
    public function getUnresolvedKeysForContract(Contract $contract): array
    {
        $keys = [];
        foreach ($contract->draftArticles as $article) {
            $unresolved = $article->unresolved_variable_keys;
            if (is_array($unresolved)) {
                foreach ($unresolved as $k) {
                    $keys[$k] = true;
                }
            }
        }

        return array_keys($keys);
    }
}
