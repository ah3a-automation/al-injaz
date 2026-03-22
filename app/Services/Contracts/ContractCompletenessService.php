<?php

declare(strict_types=1);

namespace App\Services\Contracts;

use App\Models\Contract;
use App\Models\ContractDraftArticle;
use App\Models\ContractTemplate;
use App\Models\ContractArticleVersion;

/**
 * Assesses contract draft completeness: merge-field variables, mandatory risk-tag coverage by template type,
 * and negotiated-article warnings. Clause coverage uses risk_tags on the pinned library version when available,
 * otherwise the source article's current version (may differ if the library was updated after the draft was created).
 */
final class ContractCompletenessService
{
    /** @var array<string, array<int, string>> */
    private const MANDATORY_TAGS_BY_TEMPLATE_TYPE = [
        ContractTemplate::TYPE_SUPPLY => ['payment', 'warranty', 'termination'],
        ContractTemplate::TYPE_SUPPLY_INSTALL => ['payment', 'warranty', 'termination', 'variation'],
        ContractTemplate::TYPE_SUBCONTRACT => ['payment', 'delay_damages', 'retention', 'warranty', 'termination', 'variation', 'dispute_resolution'],
        ContractTemplate::TYPE_SERVICE => ['payment', 'termination', 'confidentiality'],
        ContractTemplate::TYPE_CONSULTANCY => ['payment', 'termination', 'confidentiality', 'liability'],
    ];

    public function __construct(
        private readonly ContractVariableResolver $variableResolver,
        private readonly ContractDraftRenderingService $draftRenderingService,
    ) {
    }

    /**
     * @return array{
     *     variables_filled: int,
     *     variables_total: int,
     *     variables_percent: int,
     *     mandatory_tags_required: array<int, string>,
     *     mandatory_tags_covered: array<int, string>,
     *     mandatory_tags_missing: array<int, string>,
     *     negotiated_articles_count: int,
     *     unresolved_negotiation_notes_count: int,
     *     is_ready_for_approval: bool,
     *     blocking_reasons: array<int, string>,
     *     overall_status: 'ready'|'needs_attention'|'blocked',
     *     coverage_limitation_note: string|null,
     * }
     */
    public function assess(Contract $contract): array
    {
        $contract->loadMissing([
            'template:id,code,name_en,name_ar,template_type',
            'draftArticles' => fn ($q) => $q->orderBy('sort_order'),
            'draftArticles.sourceArticleVersion',
            'draftArticles.sourceArticle.currentVersion',
            'variableOverrides',
        ]);

        $resolved = $this->variableResolver->resolve($contract);
        $missingVariableEntries = $this->buildMissingVariableEntries($contract, $resolved);
        $missingVariableKeys = array_values(array_unique(array_column($missingVariableEntries, 'key')));

        $scopeKeys = $this->buildVariableScopeKeys($contract);
        $missingLookup = array_fill_keys($missingVariableKeys, true);
        $variablesFilled = 0;
        foreach ($scopeKeys as $key) {
            if (! isset($missingLookup[$key])) {
                $variablesFilled++;
            }
        }
        $variablesTotal = count($scopeKeys);
        $variablesPercent = $variablesTotal === 0
            ? 100
            : (int) min(100, max(0, (int) round(100 * $variablesFilled / $variablesTotal)));

        $templateType = $contract->template?->template_type;
        $mandatoryRequired = [];
        if (is_string($templateType) && isset(self::MANDATORY_TAGS_BY_TEMPLATE_TYPE[$templateType])) {
            $mandatoryRequired = self::MANDATORY_TAGS_BY_TEMPLATE_TYPE[$templateType];
        }

        $coveredTags = $this->collectCoveredRiskTags($contract);
        $mandatoryCovered = array_values(array_intersect($mandatoryRequired, $coveredTags));
        $mandatoryMissing = array_values(array_diff($mandatoryRequired, $coveredTags));

        $negotiatedCount = $contract->draftArticles
            ->filter(static fn (ContractDraftArticle $d): bool => $d->is_modified === true)
            ->count();

        $unresolvedNegotiationNotesCount = $contract->draftArticles
            ->filter(fn (ContractDraftArticle $d): bool => $this->draftHasOpenNegotiationNotes($d))
            ->count();

        $blockingReasons = [];

        foreach ($missingVariableEntries as $row) {
            $label = $row['label'] ?? $row['key'];
            $blockingReasons[] = __('contracts.completeness.reasons.unresolved_variable', ['label' => $label]);
        }

        foreach ($mandatoryMissing as $tag) {
            $blockingReasons[] = __('contracts.completeness.reasons.missing_mandatory_tag', [
                'tag' => $this->riskTagLabel($tag),
            ]);
        }

        $isReadyForApproval = $blockingReasons === [];

        $overallStatus = 'ready';
        if ($blockingReasons !== []) {
            $overallStatus = 'blocked';
        } elseif ($negotiatedCount > 0) {
            $overallStatus = 'needs_attention';
        }

        $coverageNote = null;
        if ($mandatoryRequired !== []) {
            $coverageNote = __('contracts.completeness.coverage_limitation_note');
        }

        return [
            'variables_filled' => $variablesFilled,
            'variables_total' => $variablesTotal,
            'variables_percent' => $variablesPercent,
            'mandatory_tags_required' => $mandatoryRequired,
            'mandatory_tags_covered' => $mandatoryCovered,
            'mandatory_tags_missing' => $mandatoryMissing,
            'negotiated_articles_count' => $negotiatedCount,
            'unresolved_negotiation_notes_count' => $unresolvedNegotiationNotesCount,
            'is_ready_for_approval' => $isReadyForApproval,
            'blocking_reasons' => $blockingReasons,
            'overall_status' => $overallStatus,
            'coverage_limitation_note' => $coverageNote,
        ];
    }

    /**
     * @param  array<string, string|null>  $resolved
     * @return array<int, array{key: string, label: string, source: string}>
     */
    private function buildMissingVariableEntries(Contract $contract, array $resolved): array
    {
        $fromDrafts = $this->draftRenderingService->getUnresolvedKeysForContract($contract);
        $manualMissing = [];
        foreach (ContractVariableRegistry::getVariables() as $key => $def) {
            if (($def['source'] ?? '') !== 'manual') {
                continue;
            }
            $val = $resolved[$key] ?? null;
            if ($val === null || trim((string) $val) === '') {
                $manualMissing[$key] = true;
            }
        }

        $keys = array_unique(array_merge($fromDrafts, array_keys($manualMissing)));
        sort($keys);

        $out = [];
        foreach ($keys as $key) {
            $def = ContractVariableRegistry::get($key);
            $label = $def['label_en'] ?? $key;
            $source = ($def['source'] ?? '') === 'manual' ? 'manual' : 'system';
            $out[] = [
                'key' => $key,
                'label' => $label,
                'source' => $source,
            ];
        }

        return $out;
    }

    /**
     * Variables in scope: keys referenced in draft merge fields (used/unresolved) plus all manual registry keys
     * (same completeness contract as advisory AI — manual fields are optional until filled).
     *
     * @return array<int, string>
     */
    private function buildVariableScopeKeys(Contract $contract): array
    {
        $keys = [];
        foreach ($contract->draftArticles as $article) {
            foreach ($article->used_variable_keys ?? [] as $k) {
                if (is_string($k) && $k !== '') {
                    $keys[$k] = true;
                }
            }
            foreach ($article->unresolved_variable_keys ?? [] as $k) {
                if (is_string($k) && $k !== '') {
                    $keys[$k] = true;
                }
            }
        }
        foreach (ContractVariableRegistry::getVariables() as $key => $def) {
            if (($def['source'] ?? '') === 'manual') {
                $keys[$key] = true;
            }
        }

        $list = array_keys($keys);
        sort($list);

        return $list;
    }

    /**
     * @return array<int, string> Sorted unique risk tag strings covered by draft-linked article versions.
     */
    private function collectCoveredRiskTags(Contract $contract): array
    {
        $found = [];
        foreach ($contract->draftArticles as $draft) {
            $version = $draft->sourceArticleVersion;
            if ($version === null && $draft->source_contract_article_id) {
                $version = $draft->sourceArticle?->currentVersion;
            }
            if ($version === null) {
                continue;
            }
            $tags = $version->risk_tags;
            if (! is_array($tags)) {
                continue;
            }
            foreach ($tags as $tag) {
                if (is_string($tag) && $tag !== '' && in_array($tag, ContractArticleVersion::RISK_TAGS, true)) {
                    $found[$tag] = true;
                }
            }
        }

        $list = array_keys($found);
        sort($list);

        return $list;
    }

    private function draftHasOpenNegotiationNotes(ContractDraftArticle $draft): bool
    {
        $notes = trim((string) ($draft->negotiation_notes ?? ''));
        if ($notes === '') {
            return false;
        }

        return in_array($draft->negotiation_status ?? '', [
            ContractDraftArticle::NEGOTIATION_NOT_REVIEWED,
            ContractDraftArticle::NEGOTIATION_IN_NEGOTIATION,
            ContractDraftArticle::NEGOTIATION_DEVIATION_FLAGGED,
            ContractDraftArticle::NEGOTIATION_READY_FOR_REVIEW,
        ], true);
    }

    private function riskTagLabel(string $tag): string
    {
        $line = __('contracts.completeness.risk_tags.'.$tag);
        if ($line !== 'contracts.completeness.risk_tags.'.$tag) {
            return $line;
        }

        return str_replace('_', ' ', $tag);
    }
}

