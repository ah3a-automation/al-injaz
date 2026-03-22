<?php

declare(strict_types=1);

namespace Tests\Feature\Contracts;

use App\Models\Contract;
use App\Models\ContractArticle;
use App\Models\ContractTemplate;
use App\Models\Rfq;
use App\Models\Supplier;
use App\Models\User;
use App\Models\ContractVariableOverride;
use App\Services\Contracts\ContractCompletenessService;
use App\Services\Contracts\ContractVariableRegistry;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

final class ContractCompletenessTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware(ValidateCsrfToken::class);
        $this->seed(RolesAndPermissionsSeeder::class);
        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }

    private function managerUser(): User
    {
        $user = User::factory()->create();
        $user->givePermissionTo('contract.manage');

        return $user;
    }

    /**
     * @return array{0: Contract, 1: ContractTemplate}
     */
    private function createContractWithTemplate(User $user, string $templateType): array
    {
        $supplier = Supplier::create([
            'id' => (string) Str::uuid(),
            'supplier_code' => 'SUP-C-' . strtoupper(Str::random(4)),
            'legal_name_en' => 'Completeness Supplier',
            'country' => 'SA',
            'city' => 'Riyadh',
            'status' => Supplier::STATUS_APPROVED,
        ]);

        $rfq = Rfq::create([
            'id' => (string) Str::uuid(),
            'rfq_number' => 'RFQ-C-' . strtoupper(Str::random(6)),
            'title' => 'Completeness RFQ',
            'status' => 'draft',
            'created_by' => $user->id,
            'project_id' => null,
            'procurement_package_id' => null,
        ]);

        $template = ContractTemplate::create([
            'code' => 'TPL-C-' . strtoupper(Str::random(4)),
            'name_en' => 'Test Template',
            'name_ar' => 'قالب',
            'template_type' => $templateType,
            'status' => ContractTemplate::STATUS_ACTIVE,
            'approval_status' => ContractTemplate::APPROVAL_LEGAL_APPROVED,
            'created_by_user_id' => $user->id,
            'updated_by_user_id' => $user->id,
        ]);

        $contract = Contract::create([
            'rfq_id' => $rfq->id,
            'supplier_id' => $supplier->id,
            'contract_number' => 'CT-C-' . strtoupper(Str::random(6)),
            'contract_value' => 1000,
            'commercial_total' => 1000,
            'currency' => 'SAR',
            'status' => Contract::STATUS_DRAFT,
            'source_type' => 'manual',
            'created_by' => $user->id,
            'contract_template_id' => $template->id,
        ]);

        foreach (ContractVariableRegistry::getVariables() as $key => $def) {
            if (($def['source'] ?? '') === 'manual') {
                ContractVariableOverride::create([
                    'contract_id' => $contract->id,
                    'variable_key' => $key,
                    'value_text' => 'test',
                    'created_by_user_id' => $user->id,
                    'updated_by_user_id' => $user->id,
                ]);
            }
        }

        return [$contract, $template];
    }

    public function test_assess_marks_blocked_when_mandatory_tags_missing(): void
    {
        $user = $this->managerUser();
        [$contract] = $this->createContractWithTemplate($user, ContractTemplate::TYPE_SERVICE);

        /** @var ContractCompletenessService $svc */
        $svc = app(ContractCompletenessService::class);
        $a = $svc->assess($contract->fresh());

        $this->assertSame('blocked', $a['overall_status']);
        $this->assertFalse($a['is_ready_for_approval']);
        $this->assertContains('payment', $a['mandatory_tags_missing']);
        $this->assertNotEmpty($a['blocking_reasons']);
    }

    public function test_submit_for_review_fails_when_completeness_blocked(): void
    {
        $user = $this->managerUser();
        [$contract] = $this->createContractWithTemplate($user, ContractTemplate::TYPE_SERVICE);

        $contract->status = Contract::STATUS_READY_FOR_REVIEW;
        $contract->save();

        $this->actingAs($user)
            ->post(route('contracts.submit-for-review', $contract))
            ->assertRedirect()
            ->assertSessionHas('error');
    }

    public function test_assess_ready_when_tags_and_variables_satisfied(): void
    {
        $user = $this->managerUser();
        [$contract] = $this->createContractWithTemplate($user, ContractTemplate::TYPE_SERVICE);

        $article = ContractArticle::create([
            'code' => 'C-ART-1',
            'serial' => random_int(60000, 69999),
            'category' => ContractArticle::CATEGORY_MANDATORY,
            'status' => ContractArticle::STATUS_ACTIVE,
            'approval_status' => ContractArticle::APPROVAL_LEGAL_APPROVED,
            'created_by_user_id' => $user->id,
            'updated_by_user_id' => $user->id,
        ]);
        $v = $article->versions()->create([
            'version_number' => 1,
            'title_ar' => 'ع',
            'title_en' => 'Svc clauses',
            'content_ar' => 'نص',
            'content_en' => 'Body {{contract.number}}',
            'changed_by_user_id' => $user->id,
            'risk_tags' => ['payment', 'termination', 'confidentiality'],
        ]);
        $article->update(['current_version_id' => $v->id]);

        \App\Models\ContractDraftArticle::create([
            'contract_id' => $contract->id,
            'sort_order' => 1,
            'source_contract_article_id' => $article->id,
            'source_contract_article_version_id' => $v->id,
            'article_code' => $article->code,
            'title_en' => 't',
            'title_ar' => 'ت',
            'content_en' => '{{contract.number}}',
            'content_ar' => '',
            'origin_type' => \App\Models\ContractDraftArticle::ORIGIN_LIBRARY,
            'is_modified' => false,
            'used_variable_keys' => ['contract.number'],
            'unresolved_variable_keys' => [],
        ]);

        /** @var ContractCompletenessService $svc */
        $svc = app(ContractCompletenessService::class);
        $a = $svc->assess($contract->fresh());

        $this->assertSame([], $a['mandatory_tags_missing']);
        $this->assertTrue($a['is_ready_for_approval']);
        $this->assertSame('ready', $a['overall_status']);
    }
}
