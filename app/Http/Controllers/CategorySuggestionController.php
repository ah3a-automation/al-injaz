<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\AiUsageLog;
use App\Models\SupplierCategory;
use App\Models\SystemSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class CategorySuggestionController extends Controller
{
    public function suggest(Request $request): JsonResponse
    {
        if (SystemSetting::get('ai_category_suggestions_enabled') !== '1') {
            return response()->json(['suggested_category_ids' => []]);
        }

        $endpoint = SystemSetting::get('ai_category_suggestions_endpoint');
        $apiKey   = SystemSetting::get('ai_category_suggestions_api_key');
        $model    = SystemSetting::get('ai_category_suggestions_model', 'gpt-4o-mini');
        $sarRate  = (float) SystemSetting::get('ai_category_suggestions_usd_sar_rate', '3.75');
        $dailyLimit = (float) SystemSetting::get('ai_category_suggestions_daily_usd_limit', '10.00');

        if (! $endpoint || ! $apiKey) {
            return response()->json(['suggested_category_ids' => []]);
        }

        $todayCost = AiUsageLog::whereDate('created_at', today())->sum('cost_usd');
        if ($todayCost >= $dailyLimit) {
            return response()->json(['suggested_category_ids' => [], 'daily_limit_reached' => true]);
        }

        $validated = $request->validate([
            'supplier_type'  => 'nullable|string|max:100',
            'legal_name_en' => 'nullable|string|max:255',
            'legal_name_ar' => 'nullable|string|max:255',
            'trade_name'    => 'nullable|string|max:255',
            'website'       => 'nullable|string|max:255',
        ]);

        if (empty($validated['legal_name_en']) && empty($validated['trade_name'])) {
            return response()->json(['suggested_category_ids' => []]);
        }

        $cacheKey = 'ai-cat-sug:' . sha1(json_encode([
            'supplier_type'  => $validated['supplier_type'] ?? '',
            'legal_name_en'  => $validated['legal_name_en'] ?? '',
            'legal_name_ar'  => $validated['legal_name_ar'] ?? '',
            'trade_name'     => $validated['trade_name'] ?? '',
            'website'        => $validated['website'] ?? '',
        ]));

        $cached = Cache::get($cacheKey);
        if ($cached !== null) {
            return response()->json(['suggested_category_ids' => $cached]);
        }

        $categories = SupplierCategory::where('is_active', true)
            ->where('level', '>=', 2)
            ->select('id', 'code', 'name_en', 'name_ar', 'level', 'supplier_type')
            ->orderBy('level')
            ->limit(400)
            ->get();

        $categoryList = $categories->map(fn ($c) =>
            "{$c->id} | {$c->code} | {$c->name_en} | level:{$c->level} | type:{$c->supplier_type}"
        )->join("\n");

        $supplierJson = json_encode([
            'legal_name_en' => $validated['legal_name_en'] ?? '',
            'legal_name_ar' => $validated['legal_name_ar'] ?? '',
            'trade_name'    => $validated['trade_name'] ?? '',
            'supplier_type' => $validated['supplier_type'] ?? '',
            'website'       => $validated['website'] ?? '',
        ], JSON_UNESCAPED_UNICODE);

        $prompt = <<<PROMPT
You are a procurement category classifier for a construction company.

Supplier data (JSON):
{$supplierJson}

Available categories (id | code | name_en | level | supplier_type):
{$categoryList}

Return ONLY a JSON object with the top 5 most relevant category IDs:
{"suggested_category_ids": ["id1", "id2", "id3", "id4", "id5"]}

Rules:
- Only use IDs from the list above
- Prefer level 2 and level 3 categories
- Match supplier_type when relevant
- Return valid JSON only, no explanation, no markdown
PROMPT;

        $start = microtime(true);

        try {
            $response = Http::withToken($apiKey)
                ->timeout(15)
                ->post($endpoint, [
                    'model'       => $model,
                    'messages'    => [
                        ['role' => 'system', 'content' => 'You are a procurement category classifier. Return only valid JSON with no markdown.'],
                        ['role' => 'user',   'content' => $prompt],
                    ],
                    'max_tokens'  => 200,
                    'temperature' => 0.2,
                ]);

            $responseTimeMs = (int) ((microtime(true) - $start) * 1000);

            if (! $response->successful()) {
                Log::warning('AI category suggestion HTTP error', [
                    'status'   => $response->status(),
                    'supplier' => $validated,
                ]);
                return response()->json(['suggested_category_ids' => []]);
            }

            $responseBody = $response->json();
            $raw = data_get($responseBody, 'choices.0.message.content')
                ?? data_get($responseBody, 'output_text')
                ?? '{}';
            $usage = $response->json('usage', []);

            preg_match('/\{.*\}/s', $raw, $matches);
            $decoded = json_decode($matches[0] ?? '{}', true);
            if (! is_array($decoded)) {
                $decoded = [];
            }
            $ids = $decoded['suggested_category_ids'] ?? [];

            $validIds = $categories->pluck('id')->map(fn ($id) => (string) $id)->toArray();
            $ids = array_values(array_filter($ids, fn ($id) => in_array((string) $id, $validIds, true)));
            $ids = array_slice($ids, 0, 5);

            $promptTokens     = (int) ($usage['prompt_tokens'] ?? 0);
            $completionTokens = (int) ($usage['completion_tokens'] ?? 0);
            $totalTokens      = (int) ($usage['total_tokens'] ?? ($promptTokens + $completionTokens));
            $costUsd          = $this->calculateCost($model, $promptTokens, $completionTokens);
            $costSar          = $costUsd * $sarRate;

            AiUsageLog::create([
                'feature'           => 'category_suggestions',
                'model'             => $model,
                'prompt_tokens'     => $promptTokens,
                'completion_tokens' => $completionTokens,
                'total_tokens'      => $totalTokens,
                'cost_usd'          => $costUsd,
                'cost_sar'          => $costSar,
                'response_time_ms'  => $responseTimeMs,
                'user_id'           => $request->user()?->id,
            ]);

            Cache::put($cacheKey, $ids, now()->addMinutes(30));

            return response()->json(['suggested_category_ids' => $ids]);
        } catch (\Throwable $e) {
            Log::warning('AI category suggestion failed', [
                'supplier' => $validated,
                'error'    => $e->getMessage(),
            ]);
            return response()->json(['suggested_category_ids' => []]);
        }
    }

    private function calculateCost(string $model, int $promptTokens, int $completionTokens): float
    {
        $pricing = [
            'gpt-4o-mini'   => ['input' => 0.000150, 'output' => 0.000600],
            'gpt-4o'        => ['input' => 0.005000, 'output' => 0.015000],
            'gpt-4-turbo'   => ['input' => 0.010000, 'output' => 0.030000],
            'gpt-3.5-turbo' => ['input' => 0.000500, 'output' => 0.001500],
        ];
        $rates = $pricing[$model] ?? $pricing['gpt-4o-mini'];

        return ($promptTokens / 1000 * $rates['input'])
             + ($completionTokens / 1000 * $rates['output']);
    }
}
