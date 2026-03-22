<?php

declare(strict_types=1);

namespace App\Services\Contracts;

use App\Models\Contract;
use App\Models\ContractDraftArticle;

/**
 * Gathers contract header, source metadata, and rendered draft article content into a normalized structure for DOCX/PDF generation.
 */
final class ContractDocumentAssembler
{
    public function __construct(
        private readonly ContractArticleRenderer $renderer,
        private readonly ContractArticleBlockComposer $blockComposer,
    ) {
    }

    /**
     * Assemble document data from contract (draft mode: current rendered content).
     *
     * @return array{contract_metadata: array<string, mixed>, source_metadata: array<string, mixed>, articles: array<int, array<string, mixed>>, generation_mode: string, issue_package_metadata: array<string, mixed>|null}
     */
    public function assembleForDraft(Contract $contract): array
    {
        $contract->load(['draftArticles', 'supplier', 'project', 'rfq', 'template']);

        $articles = [];
        foreach ($contract->draftArticles as $article) {
            $row = [
                'article_code' => $article->article_code ?? '',
                'title_en' => $article->title_en ?? '',
                'title_ar' => $article->title_ar ?? '',
                'rendered_content_en' => $article->rendered_content_en ?? $article->content_en ?? '',
                'rendered_content_ar' => $article->rendered_content_ar ?? $article->content_ar ?? '',
                'blocks' => is_array($article->blocks) ? $article->blocks : null,
                'sort_order' => (int) ($article->sort_order ?? 0),
                'block_segments' => null,
            ];
            if (is_array($article->blocks) && $article->blocks !== []) {
                $segments = $this->buildRenderedBlockSegmentsForDocx($contract, $article);
                if ($segments !== []) {
                    $row['block_segments'] = $segments;
                }
            }
            $articles[] = $row;
        }

        return [
            'contract_metadata' => [
                'contract_number' => $contract->contract_number,
                'title_en' => $contract->title_en,
                'title_ar' => $contract->title_ar,
                'status' => $contract->status,
                'contract_value' => $contract->contract_value,
                'currency' => $contract->currency,
                'start_date' => $contract->start_date?->format('Y-m-d'),
                'end_date' => $contract->end_date?->format('Y-m-d'),
            ],
            'source_metadata' => [
                'rfq_number' => $contract->rfq?->rfq_number,
                'rfq_title' => $contract->rfq?->title,
                'project_name' => $contract->project?->name ?? $contract->project?->name_en,
                'project_code' => $contract->project?->code,
                'supplier_name' => $contract->supplier?->legal_name_en,
                'supplier_code' => $contract->supplier?->supplier_code,
                'template_code' => $contract->template?->code,
            ],
            'articles' => $articles,
            'generation_mode' => 'draft',
            'issue_package_metadata' => null,
        ];
    }

    /**
     * Assemble document data for signature package context (tied to current issue package).
     *
     * @return array{contract_metadata: array<string, mixed>, source_metadata: array<string, mixed>, articles: array<int, array<string, mixed>>, generation_mode: string, issue_package_metadata: array<string, mixed>|null}
     */
    public function assembleForSignaturePackage(Contract $contract): array
    {
        $data = $this->assembleForDraft($contract);
        $data['generation_mode'] = 'signature_package';

        $package = $contract->currentIssuePackage;
        if ($package !== null) {
            $data['issue_package_metadata'] = [
                'issue_version' => $package->issue_version,
                'package_status' => $package->package_status,
                'prepared_at' => $package->prepared_at?->format('Y-m-d H:i'),
                'snapshot_contract_number' => $package->snapshot_contract_number,
                'snapshot_contract_title_en' => $package->snapshot_contract_title_en,
                'snapshot_contract_title_ar' => $package->snapshot_contract_title_ar,
                'snapshot_supplier_name' => $package->snapshot_supplier_name,
                'snapshot_article_count' => $package->snapshot_article_count,
            ];
        } else {
            $data['issue_package_metadata'] = null;
        }

        return $data;
    }

    /**
     * @return array<int, array{rendered_en: string, rendered_ar: string}>
     */
    private function buildRenderedBlockSegmentsForDocx(Contract $contract, ContractDraftArticle $article): array
    {
        $blocks = $article->blocks;
        if (! is_array($blocks) || $blocks === []) {
            return [];
        }

        $out = [];
        foreach ($this->blockComposer->sortBlocks($blocks) as $block) {
            if (! is_array($block)) {
                continue;
            }
            if (($block['is_internal'] ?? false) === true) {
                continue;
            }
            if (($block['type'] ?? '') === 'note') {
                continue;
            }
            $en = $this->blockComposer->plainBodyForBlockAndLang($block, 'en', false);
            $ar = $this->blockComposer->plainBodyForBlockAndLang($block, 'ar', false);
            $out[] = [
                'rendered_en' => $this->renderer->render($en, $contract)['rendered_content'],
                'rendered_ar' => $this->renderer->render($ar, $contract)['rendered_content'],
            ];
        }

        return $out;
    }
}
