<?php

declare(strict_types=1);

namespace Tests\Feature\Contracts;

use App\Models\Contract;
use App\Models\ContractArticle;
use App\Models\Rfq;
use App\Models\Supplier;
use App\Models\SystemSetting;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

final class ContractArticleAiSuggestionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware(ValidateCsrfToken::class);
        $this->seed(RolesAndPermissionsSeeder::class);
        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }

    private function configureAiSettings(): void
    {
        SystemSetting::set('ai_contract_workspace_suggestions_enabled', '1');
        SystemSetting::set('ai_contract_workspace_suggestions_endpoint', 'https://example.test/v1/chat');
        SystemSetting::set('ai_contract_workspace_suggestions_api_key', 'sk-test');
        SystemSetting::set('ai_contract_workspace_suggestions_model', 'gpt-4o-mini');
        SystemSetting::set('ai_category_suggestions_daily_usd_limit', '99999');
        SystemSetting::set('ai_category_suggestions_usd_sar_rate', '3.75');
    }

    private function managerUser(): User
    {
        $user = User::factory()->create();
        $user->givePermissionTo('contract.manage');

        return $user;
    }

    private function createContract(User $user): Contract
    {
        $supplier = Supplier::create([
            'id' => (string) Str::uuid(),
            'supplier_code' => 'SUP-AI-' . strtoupper(Str::random(4)),
            'legal_name_en' => 'AI Test Supplier',
            'country' => 'SA',
            'city' => 'Riyadh',
            'status' => Supplier::STATUS_APPROVED,
        ]);

        $rfq = Rfq::create([
            'id' => (string) Str::uuid(),
            'rfq_number' => 'RFQ-AI-' . strtoupper(Str::random(6)),
            'title' => 'AI suggestion test RFQ',
            'status' => 'draft',
            'created_by' => $user->id,
            'project_id' => null,
            'procurement_package_id' => null,
        ]);

        return Contract::create([
            'rfq_id' => $rfq->id,
            'supplier_id' => $supplier->id,
            'contract_number' => 'CT-AI-' . strtoupper(Str::random(6)),
            'contract_value' => 1000,
            'commercial_total' => 1000,
            'currency' => 'SAR',
            'status' => Contract::STATUS_DRAFT,
            'source_type' => 'manual',
            'created_by' => $user->id,
        ]);
    }

    private function createActiveLibraryArticle(User $user, string $code): ContractArticle
    {
        $article = ContractArticle::create([
            'code' => $code,
            'serial' => random_int(80000, 89999),
            'category' => ContractArticle::CATEGORY_MANDATORY,
            'status' => ContractArticle::STATUS_ACTIVE,
            'approval_status' => ContractArticle::APPROVAL_LEGAL_APPROVED,
            'created_by_user_id' => $user->id,
            'updated_by_user_id' => $user->id,
        ]);
        $v = $article->versions()->create([
            'version_number' => 1,
            'title_ar' => 'عنوان',
            'title_en' => 'Title ' . $code,
            'content_ar' => 'نص',
            'content_en' => 'Body',
            'changed_by_user_id' => $user->id,
        ]);
        $article->update(['current_version_id' => $v->id]);

        return $article->fresh();
    }

    public function test_ai_suggest_returns_parsed_suggestions_and_does_not_mutate_contract(): void
    {
        $this->configureAiSettings();
        $user = $this->managerUser();
        $contract = $this->createContract($user);
        $article = $this->createActiveLibraryArticle($user, 'AI-ART-OK');

        $payload = [
            'suggested_articles' => [
                [
                    'article_id' => (string) $article->id,
                    'confidence' => 'high',
                    'reason' => 'Test reason',
                    'is_mandatory' => true,
                ],
                [
                    'article_id' => (string) Str::uuid(),
                    'confidence' => 'low',
                    'reason' => 'Bad id',
                    'is_mandatory' => false,
                ],
            ],
            'suggested_template_id' => null,
            'suggested_template_reason' => null,
            'risk_flags' => ['Review payment terms'],
        ];

        Http::fake([
            'https://example.test/*' => Http::response([
                'choices' => [
                    ['message' => ['content' => json_encode($payload, JSON_THROW_ON_ERROR)]],
                ],
                'usage' => [
                    'prompt_tokens' => 100,
                    'completion_tokens' => 50,
                    'total_tokens' => 150,
                ],
            ], 200),
        ]);

        $templateIdBefore = $contract->contract_template_id;
        $draftCount = $contract->draftArticles()->count();

        $response = $this->actingAs($user)
            ->postJson(route('contracts.ai-suggest', $contract));

        $response->assertOk()
            ->assertJsonPath('suggested_articles.0.article_id', (string) $article->id)
            ->assertJsonPath('suggested_articles.0.confidence', 'high');

        $data = $response->json();
        $this->assertCount(1, $data['suggested_articles']);
        $this->assertContains('Review payment terms', $data['risk_flags']);

        $contract->refresh();
        $this->assertSame($templateIdBefore, $contract->contract_template_id);
        $this->assertSame($draftCount, $contract->draftArticles()->count());
    }

    public function test_malformed_ai_response_yields_empty_suggestions_without_exception(): void
    {
        $this->configureAiSettings();
        $user = $this->managerUser();
        $contract = $this->createContract($user);
        $this->createActiveLibraryArticle($user, 'AI-ART-MAL');

        Http::fake([
            'https://example.test/*' => Http::response([
                'choices' => [
                    ['message' => ['content' => 'this is not json']],
                ],
                'usage' => ['prompt_tokens' => 1, 'completion_tokens' => 1, 'total_tokens' => 2],
            ], 200),
        ]);

        $response = $this->actingAs($user)
            ->postJson(route('contracts.ai-suggest', $contract));

        $response->assertOk();
        $this->assertSame([], $response->json('suggested_articles'));
    }

    public function test_provider_http_error_returns_user_safe_payload(): void
    {
        $this->configureAiSettings();
        $user = $this->managerUser();
        $contract = $this->createContract($user);

        Http::fake([
            'https://example.test/*' => Http::response(['error' => 'upstream'], 502),
        ]);

        $response = $this->actingAs($user)
            ->postJson(route('contracts.ai-suggest', $contract));

        $response->assertOk()
            ->assertJsonPath('error', __('contracts.ai_assist.error_provider'));
        $this->assertSame([], $response->json('suggested_articles'));
    }

    public function test_provider_exception_returns_user_safe_payload(): void
    {
        $this->configureAiSettings();
        $user = $this->managerUser();
        $contract = $this->createContract($user);

        Http::fake(function (): void {
            throw new \RuntimeException('simulated network failure');
        });

        $response = $this->actingAs($user)
            ->postJson(route('contracts.ai-suggest', $contract));

        $response->assertOk()
            ->assertJsonPath('error', __('contracts.ai_assist.error_generic'));
    }

    public function test_requires_authorization(): void
    {
        $this->configureAiSettings();
        $user = User::factory()->create();
        $contract = $this->createContract($this->managerUser());

        Http::fake();

        $this->actingAs($user)
            ->postJson(route('contracts.ai-suggest', $contract))
            ->assertForbidden();
    }

    public function test_inactive_library_article_id_from_ai_is_ignored(): void
    {
        $this->configureAiSettings();
        $user = $this->managerUser();
        $contract = $this->createContract($user);
        $activeArticle = $this->createActiveLibraryArticle($user, 'AI-ACTIVE-ONLY');

        $inactiveArticle = ContractArticle::create([
            'code' => 'AI-ARCHIVED',
            'serial' => random_int(70000, 79999),
            'category' => ContractArticle::CATEGORY_OPTIONAL,
            'status' => ContractArticle::STATUS_ARCHIVED,
            'approval_status' => ContractArticle::APPROVAL_LEGAL_APPROVED,
            'created_by_user_id' => $user->id,
            'updated_by_user_id' => $user->id,
        ]);
        $v = $inactiveArticle->versions()->create([
            'version_number' => 1,
            'title_ar' => 'ع',
            'title_en' => 'Archived',
            'content_ar' => 'نص',
            'content_en' => 'Body',
            'changed_by_user_id' => $user->id,
        ]);
        $inactiveArticle->update(['current_version_id' => $v->id]);

        $payload = [
            'suggested_articles' => [
                [
                    'article_id' => (string) $activeArticle->id,
                    'confidence' => 'high',
                    'reason' => 'Keep',
                    'is_mandatory' => false,
                ],
                [
                    'article_id' => (string) $inactiveArticle->id,
                    'confidence' => 'high',
                    'reason' => 'Should be dropped',
                    'is_mandatory' => false,
                ],
            ],
            'suggested_template_id' => null,
            'suggested_template_reason' => null,
            'risk_flags' => [],
        ];

        Http::fake([
            'https://example.test/*' => Http::response([
                'choices' => [
                    ['message' => ['content' => json_encode($payload, JSON_THROW_ON_ERROR)]],
                ],
                'usage' => [
                    'prompt_tokens' => 10,
                    'completion_tokens' => 10,
                    'total_tokens' => 20,
                ],
            ], 200),
        ]);

        $response = $this->actingAs($user)
            ->postJson(route('contracts.ai-suggest', $contract));

        $response->assertOk();
        $this->assertCount(1, $response->json('suggested_articles'));
        $this->assertSame((string) $activeArticle->id, $response->json('suggested_articles.0.article_id'));
    }
}
