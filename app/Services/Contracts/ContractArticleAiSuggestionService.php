<?php

declare(strict_types=1);

namespace App\Services\Contracts;

use App\Models\AiUsageLog;
use App\Models\Contract;
use App\Models\ContractArticle;
use App\Models\ContractTemplate;
use App\Models\SystemSetting;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Advisory AI suggestions for contract workspace (library articles, block-level hints, template fit, risk commentary).
 * Does not mutate contracts; missing variables are computed on the backend only.
 */
final class ContractArticleAiSuggestionService
{
    private const MAX_SUGGESTED_BLOCKS = 20;

    private const MAX_OPTION_RECOMMENDATIONS = 12;

    private const MAX_MISSING_BLOCK_CATEGORIES = 15;

    public function __construct(
        private readonly ContractVariableResolver $variableResolver,
        private readonly ContractDraftRenderingService $draftRenderingService,
    ) {
    }

    /**
     * @return array{
     *     suggested_articles: array<int, array<string, mixed>>,
     *     suggested_blocks: array<int, array<string, mixed>>,
     *     missing_block_categories: array<int, string>,
     *     option_recommendations: array<int, array<string, mixed>>,
     *     suggested_template_id: string|null,
     *     suggested_template_reason: string|null,
     *     suggested_template_code: string|null,
     *     suggested_template_name_en: string|null,
     *     missing_variables: array<int, array{key: string, label: string, source: string}>,
     *     risk_flags: array<int, string>,
     *     error: string|null,
     * }
     */
    public function suggestForContract(Contract $contract, ?User $actor = null): array
    {
        $contract->load([
            'supplier:id,legal_name_en,legal_name_ar,supplier_code',
            'project:id,name,name_en,code',
            'procurementPackage:id,package_no,name',
            'rfq:id,rfq_number,title,status',
            'template:id,code,name_en,name_ar,template_type,status,approval_status',
            'draftArticles' => fn ($q) => $q->orderBy('sort_order'),
        ]);

        $resolved = $this->variableResolver->resolve($contract);
        $missingVariables = $this->buildMissingVariables($contract, $resolved);

        $base = [
            'suggested_articles' => [],
            'suggested_blocks' => [],
            'missing_block_categories' => [],
            'option_recommendations' => [],
            'suggested_template_id' => null,
            'suggested_template_reason' => null,
            'suggested_template_code' => null,
            'suggested_template_name_en' => null,
            'missing_variables' => $missingVariables,
            'risk_flags' => [],
            'error' => null,
        ];

        $enabled = $this->settingEnabled();
        if (! $enabled) {
            return $base;
        }

        $endpoint = $this->setting('ai_contract_workspace_suggestions_endpoint')
            ?? SystemSetting::get('ai_category_suggestions_endpoint');
        $apiKey = $this->setting('ai_contract_workspace_suggestions_api_key')
            ?? SystemSetting::get('ai_category_suggestions_api_key');
        $model = $this->setting('ai_contract_workspace_suggestions_model')
            ?? SystemSetting::get('ai_category_suggestions_model', 'gpt-4o-mini');

        if (! is_string($endpoint) || $endpoint === '' || ! is_string($apiKey) || $apiKey === '') {
            return array_merge($base, [
                'error' => __('contracts.ai_assist.error_not_configured'),
            ]);
        }

        if ($this->isDailyLimitReached()) {
            return array_merge($base, [
                'error' => __('contracts.ai_assist.error_daily_limit'),
            ]);
        }

        $libraryArticles = ContractArticle::query()
            ->where('status', ContractArticle::STATUS_ACTIVE)
            ->where('approval_status', ContractArticle::APPROVAL_LEGAL_APPROVED)
            ->with('currentVersion')
            ->orderBy('serial')
            ->get();

        $validArticleIds = $libraryArticles->pluck('id')->map(static fn ($id): string => (string) $id)->all();
        $validArticleIdLookup = array_fill_keys($validArticleIds, true);

        $inDraftArticleIds = $contract->draftArticles
            ->pluck('source_contract_article_id')
            ->filter()
            ->map(static fn ($id): string => (string) $id)
            ->unique()
            ->values()
            ->all();

        $templates = ContractTemplate::query()
            ->where('status', ContractTemplate::STATUS_ACTIVE)
            ->where('approval_status', ContractTemplate::APPROVAL_LEGAL_APPROVED)
            ->orderBy('code')
            ->get(['id', 'code', 'name_en', 'name_ar', 'template_type']);

        $validTemplateIds = $templates->pluck('id')->map(static fn ($id): string => (string) $id)->all();
        $validTemplateIdLookup = array_fill_keys($validTemplateIds, true);

        $libraryBlockIndex = $this->buildLibraryBlockMetaIndex($libraryArticles);

        $libraryPayload = $libraryArticles->map(function (ContractArticle $a): array {
            $cv = $a->currentVersion;
            $blocks = $cv !== null ? $cv->getBlocks() : [];
            $types = [];
            foreach ($blocks as $b) {
                if (is_array($b) && isset($b['type'])) {
                    $types[] = (string) $b['type'];
                }
            }

            $blocksDetail = [];
            foreach ($blocks as $b) {
                if (! is_array($b)) {
                    continue;
                }
                $summ = $this->summarizeLibraryBlockForAi($b);
                if ($summ !== null) {
                    $blocksDetail[] = $summ;
                }
            }

            return [
                'id' => (string) $a->id,
                'code' => $a->code,
                'category' => $a->category,
                'title_en' => $cv?->title_en,
                'title_ar' => $cv?->title_ar,
                'risk_tags' => $cv?->risk_tags ?? [],
                'variable_keys' => $a->variable_keys ?? [],
                'blocks_summary' => [
                    'block_count' => count($blocks),
                    'block_types' => array_values(array_unique($types)),
                    'has_options' => in_array('option', $types, true),
                    'has_conditions' => in_array('condition', $types, true),
                ],
                'blocks_detail' => $blocksDetail,
            ];
        })->values()->all();

        $draftPayload = $contract->draftArticles->map(function ($d): array {
            $activeBlocks = $d->getActiveBlocks();
            $draftBlockRows = [];
            foreach ($activeBlocks as $b) {
                if (! is_array($b)) {
                    continue;
                }
                $summ = $this->summarizeDraftBlockForAi($b);
                if ($summ !== null) {
                    $draftBlockRows[] = $summ;
                }
            }

            return [
                'draft_article_id' => (string) $d->id,
                'article_code' => $d->article_code,
                'title_en' => $d->title_en,
                'origin_type' => $d->origin_type,
                'source_contract_article_id' => $d->source_contract_article_id !== null
                    ? (string) $d->source_contract_article_id
                    : null,
                'blocks' => $draftBlockRows,
            ];
        })->values()->all();

        $context = [
            'contract' => [
                'id' => (string) $contract->id,
                'contract_number' => $contract->contract_number,
                'status' => $contract->status,
                'title_en' => $contract->title_en,
                'title_ar' => $contract->title_ar,
                'currency' => $contract->currency,
                'contract_template_id' => $contract->contract_template_id !== null
                    ? (string) $contract->contract_template_id
                    : null,
            ],
            'supplier' => $contract->supplier?->only(['legal_name_en', 'legal_name_ar', 'supplier_code']),
            'project' => $contract->project?->only(['name', 'name_en', 'code']),
            'procurement_package' => $contract->procurementPackage?->only(['package_no', 'name']),
            'rfq' => $contract->rfq?->only(['rfq_number', 'title', 'status']),
            'current_template' => $contract->template?->only(['id', 'code', 'name_en', 'name_ar', 'template_type']),
            'draft_articles' => $draftPayload,
            'library_articles_available' => $libraryPayload,
            'templates_available' => $templates->map(static fn (ContractTemplate $t): array => [
                'id' => (string) $t->id,
                'code' => $t->code,
                'name_en' => $t->name_en,
                'name_ar' => $t->name_ar,
                'template_type' => $t->template_type,
            ])->values()->all(),
            'already_linked_library_article_ids' => $inDraftArticleIds,
            'backend_missing_variables' => $missingVariables,
        ];

        $prompt = $this->buildPrompt($context);

        $start = microtime(true);

        try {
            $response = Http::withToken($apiKey)
                ->timeout(60)
                ->post($endpoint, [
                    'model' => $model,
                    'messages' => [
                        [
                            'role' => 'system',
                            'content' => 'You are a contracts workspace assistant. Respond with a single JSON object only, no markdown fences, no commentary outside JSON.',
                        ],
                        [
                            'role' => 'user',
                            'content' => $prompt,
                        ],
                    ],
                    'max_tokens' => 4000,
                    'temperature' => 0.25,
                ]);

            $responseTimeMs = (int) ((microtime(true) - $start) * 1000);

            if (! $response->successful()) {
                Log::warning('Contract AI suggestion HTTP error', [
                    'status' => $response->status(),
                    'contract_id' => (string) $contract->id,
                ]);

                return array_merge($base, [
                    'error' => __('contracts.ai_assist.error_provider'),
                ]);
            }

            $responseBody = $response->json();
            $raw = data_get($responseBody, 'choices.0.message.content')
                ?? data_get($responseBody, 'output_text')
                ?? '{}';
            if (! is_string($raw)) {
                $raw = '{}';
            }

            $usage = $response->json('usage', []);
            $promptTokens = (int) ($usage['prompt_tokens'] ?? 0);
            $completionTokens = (int) ($usage['completion_tokens'] ?? 0);
            $totalTokens = (int) ($usage['total_tokens'] ?? ($promptTokens + $completionTokens));
            $costUsd = $this->calculateCost((string) $model, $promptTokens, $completionTokens);
            $sarRate = (float) SystemSetting::get('ai_category_suggestions_usd_sar_rate', '3.75');
            $costSar = $costUsd * $sarRate;

            AiUsageLog::create([
                'feature' => 'contract_workspace_suggestions',
                'model' => (string) $model,
                'prompt_tokens' => $promptTokens,
                'completion_tokens' => $completionTokens,
                'total_tokens' => $totalTokens,
                'cost_usd' => $costUsd,
                'cost_sar' => $costSar,
                'response_time_ms' => $responseTimeMs,
                'user_id' => $actor?->id,
            ]);

            $decoded = $this->decodeJsonObject($raw);
            $parsed = $this->parseAndSanitizeAiPayload(
                $decoded,
                $validArticleIdLookup,
                $inDraftArticleIds,
                $validTemplateIdLookup,
                $libraryBlockIndex
            );

            $enrichedArticles = $this->enrichSuggestedArticles($parsed['suggested_articles'], $libraryArticles);
            $enrichedBlocks = $this->enrichSuggestedBlocks($parsed['suggested_blocks'], $libraryArticles, $libraryBlockIndex);
            $enrichedOptionRecs = $this->enrichOptionRecommendations(
                $parsed['option_recommendations'],
                $libraryArticles,
                $libraryBlockIndex
            );
            $templateMeta = $this->enrichTemplateSuggestion($parsed['suggested_template_id'], $templates);

            return [
                'suggested_articles' => $enrichedArticles,
                'suggested_blocks' => $enrichedBlocks,
                'missing_block_categories' => $parsed['missing_block_categories'],
                'option_recommendations' => $enrichedOptionRecs,
                'suggested_template_id' => $parsed['suggested_template_id'],
                'suggested_template_reason' => $parsed['suggested_template_reason'],
                'suggested_template_code' => $templateMeta['code'],
                'suggested_template_name_en' => $templateMeta['name_en'],
                'missing_variables' => $missingVariables,
                'risk_flags' => $parsed['risk_flags'],
                'error' => null,
            ];
        } catch (\Throwable $e) {
            Log::warning('Contract AI suggestion failed', [
                'contract_id' => (string) $contract->id,
                'error' => $e->getMessage(),
            ]);

            return array_merge($base, [
                'error' => __('contracts.ai_assist.error_generic'),
            ]);
        }
    }

    /**
     * @param  array<string, string|null>  $resolved
     * @return array<int, array{key: string, label: string, source: string}>
     */
    private function buildMissingVariables(Contract $contract, array $resolved): array
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
     * @param  array<string, bool>  $validArticleIdLookup
     * @param  array<int, string>  $inDraftArticleIds
     * @param  array<string, bool>  $validTemplateIdLookup
     * @param  array<string, array<string, array{type: string, is_internal: bool, title_en: ?string, option_keys: array<int, string>}>>  $libraryBlockIndex
     * @return array{
     *     suggested_articles: array<int, array{article_id: string, confidence: string, reason: string, is_mandatory: bool}>,
     *     suggested_blocks: array<int, array{article_id: string, block_id: string, confidence: string, reason: string, is_mandatory: bool}>,
     *     missing_block_categories: array<int, string>,
     *     option_recommendations: array<int, array{article_id: string, block_id: string, confidence: string, reason: string, recommended_option_key: string|null}>,
     *     suggested_template_id: string|null,
     *     suggested_template_reason: string|null,
     *     risk_flags: array<int, string>,
     * }
     */
    private function parseAndSanitizeAiPayload(
        mixed $decoded,
        array $validArticleIdLookup,
        array $inDraftArticleIds,
        array $validTemplateIdLookup,
        array $libraryBlockIndex
    ): array {
        $draftLookup = array_fill_keys($inDraftArticleIds, true);

        $empty = [
            'suggested_articles' => [],
            'suggested_blocks' => [],
            'missing_block_categories' => [],
            'option_recommendations' => [],
            'suggested_template_id' => null,
            'suggested_template_reason' => null,
            'risk_flags' => [],
        ];

        if (! is_array($decoded)) {
            return $empty;
        }

        $articlesOut = [];
        $rawArticles = $decoded['suggested_articles'] ?? null;
        if (is_array($rawArticles)) {
            foreach ($rawArticles as $row) {
                if (! is_array($row)) {
                    continue;
                }
                $aid = isset($row['article_id']) ? (string) $row['article_id'] : '';
                if ($aid === '' || ! isset($validArticleIdLookup[$aid])) {
                    continue;
                }
                if (isset($draftLookup[$aid])) {
                    continue;
                }
                $conf = strtolower((string) ($row['confidence'] ?? 'medium'));
                if (! in_array($conf, ['high', 'medium', 'low'], true)) {
                    $conf = 'medium';
                }
                $reason = isset($row['reason']) ? trim((string) $row['reason']) : '';
                if ($reason === '') {
                    $reason = '—';
                }
                $isMandatory = isset($row['is_mandatory']) && (bool) $row['is_mandatory'];
                $articlesOut[] = [
                    'article_id' => $aid,
                    'confidence' => $conf,
                    'reason' => $reason,
                    'is_mandatory' => $isMandatory,
                ];
            }
        }

        $blocksOut = [];
        $rawBlocks = $decoded['suggested_blocks'] ?? null;
        if (is_array($rawBlocks)) {
            foreach ($rawBlocks as $row) {
                if (! is_array($row) || count($blocksOut) >= self::MAX_SUGGESTED_BLOCKS) {
                    continue;
                }
                $aid = isset($row['article_id']) ? (string) $row['article_id'] : '';
                $bid = isset($row['block_id']) ? (string) $row['block_id'] : '';
                if ($aid === '' || $bid === '' || ! isset($validArticleIdLookup[$aid])) {
                    continue;
                }
                $meta = $libraryBlockIndex[$aid][$bid] ?? null;
                if ($meta === null) {
                    continue;
                }
                if (($meta['is_internal'] ?? false) === true) {
                    continue;
                }
                $conf = strtolower((string) ($row['confidence'] ?? 'medium'));
                if (! in_array($conf, ['high', 'medium', 'low'], true)) {
                    $conf = 'medium';
                }
                $reason = isset($row['reason']) ? trim((string) $row['reason']) : '';
                if ($reason === '') {
                    $reason = '—';
                }
                $isMandatory = isset($row['is_mandatory']) && (bool) $row['is_mandatory'];
                $blocksOut[] = [
                    'article_id' => $aid,
                    'block_id' => $bid,
                    'confidence' => $conf,
                    'reason' => $reason,
                    'is_mandatory' => $isMandatory,
                ];
            }
        }

        $missingCats = [];
        $rawCats = $decoded['missing_block_categories'] ?? null;
        if (is_array($rawCats)) {
            foreach ($rawCats as $cat) {
                if (! is_string($cat) || count($missingCats) >= self::MAX_MISSING_BLOCK_CATEGORIES) {
                    continue;
                }
                $t = trim($cat);
                if ($t !== '' && mb_strlen($t) <= 160) {
                    $missingCats[] = $t;
                }
            }
        }

        $optionOut = [];
        $rawOpts = $decoded['option_recommendations'] ?? null;
        if (is_array($rawOpts)) {
            foreach ($rawOpts as $row) {
                if (! is_array($row) || count($optionOut) >= self::MAX_OPTION_RECOMMENDATIONS) {
                    continue;
                }
                $aid = isset($row['article_id']) ? (string) $row['article_id'] : '';
                $bid = isset($row['block_id']) ? (string) $row['block_id'] : '';
                if ($aid === '' || $bid === '' || ! isset($validArticleIdLookup[$aid])) {
                    continue;
                }
                $meta = $libraryBlockIndex[$aid][$bid] ?? null;
                if ($meta === null || ($meta['type'] ?? '') !== 'option') {
                    continue;
                }
                if (($meta['is_internal'] ?? false) === true) {
                    continue;
                }
                $conf = strtolower((string) ($row['confidence'] ?? 'medium'));
                if (! in_array($conf, ['high', 'medium', 'low'], true)) {
                    $conf = 'medium';
                }
                $reason = isset($row['reason']) ? trim((string) $row['reason']) : '';
                if ($reason === '') {
                    $reason = '—';
                }
                $recKey = null;
                if (isset($row['recommended_option_key']) && $row['recommended_option_key'] !== null && $row['recommended_option_key'] !== '') {
                    $k = trim((string) $row['recommended_option_key']);
                    $allowed = $meta['option_keys'] ?? [];
                    if ($k !== '' && in_array($k, $allowed, true)) {
                        $recKey = $k;
                    }
                }
                $optionOut[] = [
                    'article_id' => $aid,
                    'block_id' => $bid,
                    'confidence' => $conf,
                    'reason' => $reason,
                    'recommended_option_key' => $recKey,
                ];
            }
        }

        $tplId = null;
        $tplReason = null;
        if (isset($decoded['suggested_template_id']) && $decoded['suggested_template_id'] !== null && $decoded['suggested_template_id'] !== '') {
            $tid = (string) $decoded['suggested_template_id'];
            if (isset($validTemplateIdLookup[$tid])) {
                $tplId = $tid;
                $tplReason = isset($decoded['suggested_template_reason'])
                    ? trim((string) $decoded['suggested_template_reason'])
                    : null;
                if ($tplReason === '') {
                    $tplReason = null;
                }
            }
        }

        $riskFlags = [];
        if (isset($decoded['risk_flags']) && is_array($decoded['risk_flags'])) {
            foreach ($decoded['risk_flags'] as $flag) {
                if (! is_string($flag)) {
                    continue;
                }
                $t = trim($flag);
                if ($t !== '' && count($riskFlags) < 12) {
                    $riskFlags[] = $t;
                }
            }
        }

        return [
            'suggested_articles' => $articlesOut,
            'suggested_blocks' => $blocksOut,
            'missing_block_categories' => $missingCats,
            'option_recommendations' => $optionOut,
            'suggested_template_id' => $tplId,
            'suggested_template_reason' => $tplReason,
            'risk_flags' => $riskFlags,
        ];
    }

    /**
     * @param  \Illuminate\Support\Collection<int, ContractArticle>  $libraryArticles
     * @return array<string, array<string, array{type: string, is_internal: bool, title_en: ?string, option_keys: array<int, string>}>>
     */
    private function buildLibraryBlockMetaIndex(\Illuminate\Support\Collection $libraryArticles): array
    {
        $index = [];
        foreach ($libraryArticles as $a) {
            $aid = (string) $a->id;
            $cv = $a->currentVersion;
            $blocks = $cv !== null ? $cv->getBlocks() : [];
            $index[$aid] = [];
            foreach ($blocks as $b) {
                if (! is_array($b)) {
                    continue;
                }
                $bid = (string) ($b['id'] ?? '');
                if ($bid === '') {
                    continue;
                }
                $type = (string) ($b['type'] ?? '');
                $optionKeys = [];
                if ($type === 'option' && isset($b['options']) && is_array($b['options'])) {
                    foreach ($b['options'] as $opt) {
                        if (is_array($opt) && isset($opt['key'])) {
                            $optionKeys[] = (string) $opt['key'];
                        }
                    }
                }
                $titleEn = isset($b['title_en']) ? (string) $b['title_en'] : null;
                if ($titleEn === '') {
                    $titleEn = null;
                }
                $index[$aid][$bid] = [
                    'type' => $type,
                    'is_internal' => (bool) ($b['is_internal'] ?? false),
                    'title_en' => $titleEn,
                    'option_keys' => $optionKeys,
                ];
            }
        }

        return $index;
    }

    /**
     * @return array<string, mixed>|null
     */
    private function summarizeLibraryBlockForAi(array $b): ?array
    {
        $id = (string) ($b['id'] ?? '');
        if ($id === '') {
            return null;
        }
        $type = (string) ($b['type'] ?? '');
        $opts = $b['options'] ?? null;
        $hasOptions = $type === 'option' && is_array($opts) && count($opts) > 0;

        return [
            'id' => $id,
            'type' => $type,
            'title_en' => $b['title_en'] ?? null,
            'title_ar' => $b['title_ar'] ?? null,
            'risk_tags' => is_array($b['risk_tags'] ?? null) ? array_values($b['risk_tags']) : [],
            'variable_keys' => is_array($b['variable_keys'] ?? null) ? array_values($b['variable_keys']) : [],
            'has_options' => $hasOptions,
            'is_internal' => (bool) ($b['is_internal'] ?? false),
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    private function summarizeDraftBlockForAi(array $b): ?array
    {
        $id = (string) ($b['id'] ?? '');
        if ($id === '') {
            return null;
        }
        $type = (string) ($b['type'] ?? '');
        $opts = $b['options'] ?? null;
        $hasOptions = $type === 'option' && is_array($opts) && count($opts) > 0;

        $row = [
            'id' => $id,
            'type' => $type,
            'title_en' => $b['title_en'] ?? null,
            'title_ar' => $b['title_ar'] ?? null,
            'risk_tags' => is_array($b['risk_tags'] ?? null) ? array_values($b['risk_tags']) : [],
            'variable_keys' => is_array($b['variable_keys'] ?? null) ? array_values($b['variable_keys']) : [],
            'has_options' => $hasOptions,
            'is_internal' => (bool) ($b['is_internal'] ?? false),
        ];
        if ($type === 'option') {
            $row['selected_option'] = isset($b['selected_option']) ? (string) $b['selected_option'] : null;
        }

        return $row;
    }

    /**
     * @param  array<int, array{article_id: string, block_id: string, confidence: string, reason: string, is_mandatory: bool}>  $rows
     * @param  \Illuminate\Support\Collection<int, ContractArticle>  $libraryArticles
     * @param  array<string, array<string, array{type: string, is_internal: bool, title_en: ?string, option_keys: array<int, string>}>>  $libraryBlockIndex
     * @return array<int, array<string, mixed>>
     */
    private function enrichSuggestedBlocks(array $rows, \Illuminate\Support\Collection $libraryArticles, array $libraryBlockIndex): array
    {
        $out = [];
        foreach ($rows as $row) {
            $art = $libraryArticles->firstWhere('id', $row['article_id']);
            $meta = $libraryBlockIndex[$row['article_id']][$row['block_id']] ?? null;
            $out[] = array_merge($row, [
                'article_code' => $art?->code,
                'block_type' => $meta['type'] ?? null,
                'block_title_en' => $meta['title_en'] ?? null,
            ]);
        }

        return $out;
    }

    /**
     * @param  array<int, array{article_id: string, block_id: string, confidence: string, reason: string, recommended_option_key: string|null}>  $rows
     * @param  \Illuminate\Support\Collection<int, ContractArticle>  $libraryArticles
     * @param  array<string, array<string, array{type: string, is_internal: bool, title_en: ?string, option_keys: array<int, string>}>>  $libraryBlockIndex
     * @return array<int, array<string, mixed>>
     */
    private function enrichOptionRecommendations(array $rows, \Illuminate\Support\Collection $libraryArticles, array $libraryBlockIndex): array
    {
        $out = [];
        foreach ($rows as $row) {
            $art = $libraryArticles->firstWhere('id', $row['article_id']);
            $meta = $libraryBlockIndex[$row['article_id']][$row['block_id']] ?? null;
            $out[] = array_merge($row, [
                'article_code' => $art?->code,
                'block_title_en' => $meta['title_en'] ?? null,
            ]);
        }

        return $out;
    }

    private function decodeJsonObject(string $raw): mixed
    {
        preg_match('/\{.*\}/s', $raw, $matches);
        $json = $matches[0] ?? '{}';
        $decoded = json_decode($json, true);

        return is_array($decoded) ? $decoded : [];
    }

    /**
     * @param  array<string, mixed>  $context
     */
    private function buildPrompt(array $context): string
    {
        $json = json_encode($context, JSON_UNESCAPED_UNICODE);
        if ($json === false) {
            $json = '{}';
        }

        return <<<PROMPT
You advise on contract workspace preparation. Suggestions are non-binding; the user must confirm actions.

Context (JSON):
{$json}

Return ONLY a JSON object with this exact shape (no markdown):
{
  "suggested_articles": [
    {
      "article_id": "<uuid from library_articles_available.id>",
      "confidence": "high|medium|low",
      "reason": "short explanation",
      "is_mandatory": false
    }
  ],
  "suggested_blocks": [
    {
      "article_id": "<uuid>",
      "block_id": "<uuid from library blocks_detail.id for that article>",
      "confidence": "high|medium|low",
      "reason": "why this block matters for this contract",
      "is_mandatory": false
    }
  ],
  "missing_block_categories": ["short labels e.g. payment, retention, warranty"],
  "option_recommendations": [
    {
      "article_id": "<uuid>",
      "block_id": "<uuid of an option-type block>",
      "confidence": "high|medium|low",
      "reason": "why this variant fits",
      "recommended_option_key": "A"
    }
  ],
  "suggested_template_id": null,
  "suggested_template_reason": null,
  "risk_flags": ["optional short warnings, not legal advice"]
}

Rules:
- Only suggest article_id values that appear in library_articles_available and are NOT in already_linked_library_article_ids (for suggested_articles).
- For suggested_blocks and option_recommendations: article_id and block_id MUST match library_articles_available[].blocks_detail — block_id must be a real id from that article's blocks_detail; never invent ids.
- Do not suggest blocks where blocks_detail.is_internal is true (internal-only blocks).
- For option_recommendations, block_id must refer to a block with type "option" and recommended_option_key must match an option key from that block when provided.
- Suggest at most 8 articles, at most 20 suggested_blocks, at most 12 option_recommendations.
- suggested_template_id must be null or an id from templates_available.
- Do NOT include missing_variables in your response (the system computes them).
- Be concise. JSON only.
PROMPT;
    }

    private function settingEnabled(): bool
    {
        $v = $this->setting('ai_contract_workspace_suggestions_enabled');
        if ($v === null || $v === '') {
            return SystemSetting::get('ai_category_suggestions_enabled') === '1';
        }

        return $v === '1';
    }

    private function setting(string $key): mixed
    {
        return SystemSetting::get($key);
    }

    private function isDailyLimitReached(): bool
    {
        $dailyLimit = (float) SystemSetting::get('ai_category_suggestions_daily_usd_limit', '10.00');
        $todayCost = (float) AiUsageLog::whereDate('created_at', today())->sum('cost_usd');

        return $todayCost >= $dailyLimit;
    }

    /**
     * @param  \Illuminate\Support\Collection<int, ContractArticle>  $libraryArticles
     * @param  array<int, array{article_id: string, confidence: string, reason: string, is_mandatory: bool}>  $rows
     * @return array<int, array<string, mixed>>
     */
    private function enrichSuggestedArticles(array $rows, \Illuminate\Support\Collection $libraryArticles): array
    {
        $out = [];
        foreach ($rows as $row) {
            $art = $libraryArticles->firstWhere('id', $row['article_id']);
            $out[] = array_merge($row, [
                'article_code' => $art?->code,
                'title_en' => $art?->currentVersion?->title_en,
            ]);
        }

        return $out;
    }

    /**
     * @param  \Illuminate\Support\Collection<int, ContractTemplate>  $templates
     * @return array{code: string|null, name_en: string|null}
     */
    private function enrichTemplateSuggestion(?string $templateId, \Illuminate\Support\Collection $templates): array
    {
        if ($templateId === null || $templateId === '') {
            return ['code' => null, 'name_en' => null];
        }
        $t = $templates->firstWhere('id', $templateId);

        return [
            'code' => $t?->code,
            'name_en' => $t?->name_en,
        ];
    }

    private function calculateCost(string $model, int $promptTokens, int $completionTokens): float
    {
        $pricing = [
            'gpt-4o-mini' => ['input' => 0.000150, 'output' => 0.000600],
            'gpt-4o' => ['input' => 0.005000, 'output' => 0.015000],
            'gpt-4-turbo' => ['input' => 0.010000, 'output' => 0.030000],
            'gpt-3.5-turbo' => ['input' => 0.000500, 'output' => 0.001500],
        ];
        $rates = $pricing[$model] ?? $pricing['gpt-4o-mini'];

        return ($promptTokens / 1000 * $rates['input'])
            + ($completionTokens / 1000 * $rates['output']);
    }
}
