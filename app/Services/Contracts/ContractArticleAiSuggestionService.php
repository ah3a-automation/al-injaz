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
 * Advisory AI suggestions for contract workspace (library articles, template fit, risk commentary).
 * Does not mutate contracts; missing variables are computed on the backend only.
 */
final class ContractArticleAiSuggestionService
{
    public function __construct(
        private readonly ContractVariableResolver $variableResolver,
        private readonly ContractDraftRenderingService $draftRenderingService,
    ) {
    }

    /**
     * @return array{
     *     suggested_articles: array<int, array{article_id: string, confidence: string, reason: string, is_mandatory: bool}>,
     *     suggested_template_id: string|null,
     *     suggested_template_reason: string|null,
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

        $libraryPayload = $libraryArticles->map(static function (ContractArticle $a): array {
            $cv = $a->currentVersion;
            $blocks = $cv !== null ? $cv->getBlocks() : [];
            $types = [];
            foreach ($blocks as $b) {
                if (is_array($b) && isset($b['type'])) {
                    $types[] = (string) $b['type'];
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
            ];
        })->values()->all();

        $draftPayload = $contract->draftArticles->map(static function ($d): array {
            return [
                'article_code' => $d->article_code,
                'title_en' => $d->title_en,
                'origin_type' => $d->origin_type,
                'source_contract_article_id' => $d->source_contract_article_id !== null
                    ? (string) $d->source_contract_article_id
                    : null,
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
                    'max_tokens' => 2000,
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
                $validTemplateIdLookup
            );

            $enrichedArticles = $this->enrichSuggestedArticles($parsed['suggested_articles'], $libraryArticles);
            $templateMeta = $this->enrichTemplateSuggestion($parsed['suggested_template_id'], $templates);

            return [
                'suggested_articles' => $enrichedArticles,
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
     * @return array{
     *     suggested_articles: array<int, array{article_id: string, confidence: string, reason: string, is_mandatory: bool}>,
     *     suggested_template_id: string|null,
     *     suggested_template_reason: string|null,
     *     risk_flags: array<int, string>,
     * }
     */
    private function parseAndSanitizeAiPayload(
        mixed $decoded,
        array $validArticleIdLookup,
        array $inDraftArticleIds,
        array $validTemplateIdLookup
    ): array {
        $draftLookup = array_fill_keys($inDraftArticleIds, true);

        $empty = [
            'suggested_articles' => [],
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
            'suggested_template_id' => $tplId,
            'suggested_template_reason' => $tplReason,
            'risk_flags' => $riskFlags,
        ];
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
  "suggested_template_id": null,
  "suggested_template_reason": null,
  "risk_flags": ["optional short warnings, not legal advice"]
}

Rules:
- Only suggest article_id values that appear in library_articles_available and are NOT in already_linked_library_article_ids.
- Suggest at most 8 articles.
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
