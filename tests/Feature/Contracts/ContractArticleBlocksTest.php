<?php

declare(strict_types=1);

namespace Tests\Feature\Contracts;

use App\Models\Contract;
use App\Models\ContractArticle;
use App\Models\Rfq;
use App\Models\Supplier;
use App\Models\SystemSetting;
use App\Models\User;
use App\Services\Contracts\ContractArticleBlockComposer;
use App\Services\Contracts\ContractArticleRenderer;
use App\Services\Contracts\ContractArticleVersionService;
use App\Services\Contracts\ContractDocxGenerator;
use App\Services\Contracts\ContractArticleAiSuggestionService;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;
use ZipArchive;

final class ContractArticleBlocksTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware(ValidateCsrfToken::class);
        $this->seed(RolesAndPermissionsSeeder::class);
        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }

    public function test_version_without_db_blocks_get_blocks_returns_synthetic_clause(): void
    {
        $user = User::factory()->create();
        $article = ContractArticle::create([
            'code' => 'BLK-1',
            'serial' => 91001,
            'category' => ContractArticle::CATEGORY_MANDATORY,
            'status' => ContractArticle::STATUS_DRAFT,
            'approval_status' => ContractArticle::APPROVAL_NONE,
            'created_by_user_id' => $user->id,
            'updated_by_user_id' => $user->id,
        ]);
        $v = $article->versions()->create([
            'version_number' => 1,
            'title_ar' => 'ع',
            'title_en' => 'T',
            'content_ar' => 'AR body',
            'content_en' => 'EN body',
            'changed_by_user_id' => $user->id,
        ]);
        $article->update(['current_version_id' => $v->id]);
        $v->refresh();

        $this->assertNull($v->blocks);
        $blocks = $v->getBlocks();
        $this->assertCount(1, $blocks);
        $this->assertSame('clause', $blocks[0]['type']);
        $this->assertSame('EN body', $blocks[0]['body_en']);
        $this->assertSame('AR body', $blocks[0]['body_ar']);
    }

    public function test_version_service_stores_blocks_and_generates_monolithic_content(): void
    {
        $user = User::factory()->create();
        $service = app(ContractArticleVersionService::class);

        $bid = (string) Str::uuid();
        $blocks = [
            [
                'id' => $bid,
                'type' => 'clause',
                'sort_order' => 1,
                'title_en' => '',
                'title_ar' => '',
                'body_en' => 'Hello {{ contract.number }}',
                'body_ar' => 'AR',
                'variable_keys' => [],
                'risk_tags' => [],
                'is_internal' => false,
                'options' => null,
            ],
        ];

        $article = $service->createArticleWithVersion(
            [
                'code' => 'BLK-2',
                'serial' => 91002,
                'category' => ContractArticle::CATEGORY_MANDATORY,
                'status' => ContractArticle::STATUS_DRAFT,
            ],
            [
                'title_ar' => 'عنوان',
                'title_en' => 'Title',
                'change_summary' => null,
                'risk_tags' => null,
                'blocks' => $blocks,
            ],
            $user
        );

        $v = $article->currentVersion;
        $this->assertNotNull($v);
        $this->assertIsArray($v->blocks);
        $this->assertSame('Hello {{ contract.number }}', $v->content_en);
        $this->assertSame('AR', $v->content_ar);
    }

    public function test_renderer_skips_internal_blocks_in_render_blocks(): void
    {
        $user = User::factory()->create();
        $contract = $this->makeMinimalContract($user);
        $renderer = app(ContractArticleRenderer::class);

        $blocks = [
            [
                'id' => (string) Str::uuid(),
                'type' => 'clause',
                'sort_order' => 1,
                'body_en' => 'Visible',
                'body_ar' => 'V',
                'is_internal' => false,
                'options' => null,
            ],
            [
                'id' => (string) Str::uuid(),
                'type' => 'note',
                'sort_order' => 2,
                'body_en' => 'Hidden',
                'body_ar' => 'H',
                'is_internal' => true,
                'options' => null,
            ],
        ];

        $r = $renderer->renderBlocks($blocks, 'en', $contract, false, 'SAR');
        $this->assertStringContainsString('Visible', $r['rendered_content']);
        $this->assertStringNotContainsString('Hidden', $r['rendered_content']);
    }

    public function test_option_block_uses_first_option_when_no_selection_library_context(): void
    {
        $composer = app(ContractArticleBlockComposer::class);
        $blocks = [
            [
                'id' => (string) Str::uuid(),
                'type' => 'option',
                'sort_order' => 1,
                'body_en' => '',
                'body_ar' => '',
                'options' => [
                    ['key' => 'X', 'body_en' => 'First EN', 'body_ar' => 'First AR'],
                    ['key' => 'Y', 'body_en' => 'Second EN', 'body_ar' => 'Second AR'],
                ],
            ],
        ];

        $bodies = $composer->generateMonolithicBodies($blocks, true);
        $this->assertStringContainsString('First EN', $bodies['content_en']);
        $this->assertStringContainsString('First AR', $bodies['content_ar']);
    }

    public function test_option_block_uses_selected_option_in_draft_context(): void
    {
        $composer = app(ContractArticleBlockComposer::class);
        $blocks = [
            [
                'id' => (string) Str::uuid(),
                'type' => 'option',
                'sort_order' => 1,
                'body_en' => '',
                'body_ar' => '',
                'selected_option' => 'Y',
                'options' => [
                    ['key' => 'X', 'body_en' => 'First EN', 'body_ar' => 'First AR'],
                    ['key' => 'Y', 'body_en' => 'Pick EN', 'body_ar' => 'Pick AR'],
                ],
            ],
        ];

        $bodies = $composer->generateMonolithicBodies($blocks, false);
        $this->assertStringContainsString('Pick EN', $bodies['content_en']);
    }

    public function test_docx_generator_emits_numbered_block_segments(): void
    {
        $docxDir = 'contracts/test-docx';
        Storage::disk('local')->makeDirectory($docxDir);

        $assembled = [
            'contract_metadata' => [
                'contract_number' => 'C-1',
                'title_en' => 'T',
                'title_ar' => '',
                'status' => 'draft',
                'contract_value' => null,
                'currency' => 'SAR',
                'start_date' => null,
                'end_date' => null,
            ],
            'source_metadata' => [
                'rfq_number' => null,
                'rfq_title' => null,
                'project_name' => null,
                'project_code' => null,
                'supplier_name' => null,
                'supplier_code' => null,
                'template_code' => null,
            ],
            'articles' => [
                [
                    'article_code' => 'A1',
                    'title_en' => 'Article title',
                    'title_ar' => '',
                    'rendered_content_en' => 'fallback',
                    'rendered_content_ar' => '',
                    'block_segments' => [
                        ['rendered_en' => 'Seg1', 'rendered_ar' => ''],
                        ['rendered_en' => 'Seg2', 'rendered_ar' => ''],
                    ],
                ],
            ],
            'generation_mode' => 'draft',
            'issue_package_metadata' => null,
        ];

        try {
            $gen = new ContractDocxGenerator();
            $result = $gen->generate($assembled, $docxDir, 't.docx');

            $this->assertArrayHasKey('file_path', $result);
            // Local disk root is storage/app/private (see config/filesystems.php).
            $path = Storage::disk('local')->path($result['file_path']);
            $this->assertFileExists($path);
            $zip = new ZipArchive();
            $this->assertTrue($zip->open($path) === true);
            $xml = $zip->getFromName('word/document.xml');
            $zip->close();
            $this->assertIsString($xml);
            $this->assertStringContainsString('1.1', $xml);
            $this->assertStringContainsString('1.2', $xml);
        } finally {
            Storage::disk('local')->deleteDirectory($docxDir);
        }
    }

    public function test_backfill_command_populates_null_blocks(): void
    {
        $user = User::factory()->create();
        $article = ContractArticle::create([
            'code' => 'BLK-BF',
            'serial' => 91003,
            'category' => ContractArticle::CATEGORY_MANDATORY,
            'status' => ContractArticle::STATUS_DRAFT,
            'approval_status' => ContractArticle::APPROVAL_NONE,
            'created_by_user_id' => $user->id,
            'updated_by_user_id' => $user->id,
        ]);
        $v = $article->versions()->create([
            'version_number' => 1,
            'title_ar' => 'ع',
            'title_en' => 'T',
            'content_ar' => 'AR',
            'content_en' => 'EN',
            'changed_by_user_id' => $user->id,
        ]);
        $article->update(['current_version_id' => $v->id]);

        Artisan::call('contracts:backfill-article-blocks');
        $v->refresh();
        $this->assertIsArray($v->blocks);
        $this->assertCount(1, $v->blocks);
        $this->assertSame('EN', $v->content_en);
    }

    public function test_ai_payload_includes_blocks_summary(): void
    {
        Http::fake([
            'https://example.test/*' => Http::response([
                'choices' => [
                    ['message' => ['content' => '{"suggested_articles":[],"suggested_template_id":null,"suggested_template_reason":null,"risk_flags":[]}']],
                ],
                'usage' => ['prompt_tokens' => 1, 'completion_tokens' => 1, 'total_tokens' => 2],
            ], 200),
        ]);

        SystemSetting::set('ai_contract_workspace_suggestions_enabled', '1');
        SystemSetting::set('ai_contract_workspace_suggestions_endpoint', 'https://example.test/v1/chat');
        SystemSetting::set('ai_contract_workspace_suggestions_api_key', 'sk-test');
        SystemSetting::set('ai_contract_workspace_suggestions_model', 'gpt-4o-mini');
        SystemSetting::set('ai_category_suggestions_daily_usd_limit', '99999');
        SystemSetting::set('ai_category_suggestions_usd_sar_rate', '3.75');

        $user = User::factory()->create();
        $user->givePermissionTo('contract.manage');

        $article = ContractArticle::create([
            'code' => 'BLK-AI',
            'serial' => 91004,
            'category' => ContractArticle::CATEGORY_MANDATORY,
            'status' => ContractArticle::STATUS_ACTIVE,
            'approval_status' => ContractArticle::APPROVAL_LEGAL_APPROVED,
            'created_by_user_id' => $user->id,
            'updated_by_user_id' => $user->id,
        ]);
        $v = $article->versions()->create([
            'version_number' => 1,
            'title_ar' => 'ع',
            'title_en' => 'T',
            'content_ar' => 'a',
            'content_en' => 'e',
            'changed_by_user_id' => $user->id,
            'blocks' => [
                [
                    'id' => (string) Str::uuid(),
                    'type' => 'option',
                    'sort_order' => 1,
                    'body_en' => 'x',
                    'body_ar' => 'y',
                    'options' => [
                        ['key' => 'A', 'body_en' => 'a1', 'body_ar' => 'a2'],
                        ['key' => 'B', 'body_en' => 'b1', 'body_ar' => 'b2'],
                    ],
                ],
                [
                    'id' => (string) Str::uuid(),
                    'type' => 'condition',
                    'sort_order' => 2,
                    'body_en' => 'c',
                    'body_ar' => 'd',
                    'options' => null,
                ],
            ],
        ]);
        $article->update(['current_version_id' => $v->id]);

        $contract = $this->makeMinimalContract($user);

        $service = app(ContractArticleAiSuggestionService::class);
        $result = $service->suggestForContract($contract, $user);

        $this->assertNull($result['error']);
        Http::assertSent(function (\Illuminate\Http\Client\Request $request): bool {
            $body = (string) $request->body();
            $this->assertStringContainsString('blocks_summary', $body);
            $this->assertStringContainsString('blocks_detail', $body);
            $this->assertStringContainsString('has_options', $body);
            $this->assertStringContainsString('has_conditions', $body);

            return true;
        });
    }

    private function makeMinimalContract(User $user): Contract
    {
        $supplier = Supplier::create([
            'id' => (string) Str::uuid(),
            'supplier_code' => 'SUP-BLK-'.strtoupper(Str::random(4)),
            'legal_name_en' => 'Supplier',
            'country' => 'SA',
            'city' => 'Riyadh',
            'status' => Supplier::STATUS_APPROVED,
        ]);

        $rfq = Rfq::create([
            'id' => (string) Str::uuid(),
            'rfq_number' => 'RFQ-BLK-'.strtoupper(Str::random(6)),
            'title' => 'RFQ',
            'status' => 'draft',
            'created_by' => $user->id,
            'project_id' => null,
            'procurement_package_id' => null,
        ]);

        return Contract::create([
            'rfq_id' => $rfq->id,
            'supplier_id' => $supplier->id,
            'contract_number' => 'CT-BLK-'.strtoupper(Str::random(6)),
            'contract_value' => 1000,
            'commercial_total' => 1000,
            'currency' => 'SAR',
            'status' => Contract::STATUS_DRAFT,
            'source_type' => 'manual',
            'created_by' => $user->id,
        ]);
    }
}
