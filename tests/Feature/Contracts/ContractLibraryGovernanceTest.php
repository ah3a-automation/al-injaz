<?php

declare(strict_types=1);

namespace Tests\Feature\Contracts;

use App\Models\ContractArticle;
use App\Models\ContractTemplate;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

final class ContractLibraryGovernanceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware(ValidateCsrfToken::class);
        $this->seed(RolesAndPermissionsSeeder::class);
        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }

    public function test_article_submit_and_legal_approval_promotes_to_active(): void
    {
        $submitter = User::factory()->create();
        $submitter->givePermissionTo(['contract.manage', 'contract.library.submit']);

        $contracts = User::factory()->create();
        $contracts->givePermissionTo(['contract.manage', 'contract.library.approve_contracts']);

        $legal = User::factory()->create();
        $legal->givePermissionTo(['contract.manage', 'contract.library.approve_legal']);

        $article = ContractArticle::create([
            'code' => 'GOV-ART-1',
            'serial' => 90001,
            'category' => ContractArticle::CATEGORY_MANDATORY,
            'status' => ContractArticle::STATUS_DRAFT,
            'approval_status' => ContractArticle::APPROVAL_NONE,
            'created_by_user_id' => $submitter->id,
            'updated_by_user_id' => $submitter->id,
        ]);

        $v1 = $article->versions()->create([
            'version_number' => 1,
            'title_ar' => 'عنوان',
            'title_en' => 'Title',
            'content_ar' => 'محتوى',
            'content_en' => 'Body',
            'changed_by_user_id' => $submitter->id,
        ]);
        $article->update(['current_version_id' => $v1->id]);

        $this->actingAs($submitter)
            ->post(route('contract-articles.submit-for-approval', $article))
            ->assertRedirect();

        $article->refresh();
        $this->assertSame(ContractArticle::APPROVAL_SUBMITTED, $article->approval_status);

        $this->actingAs($contracts)
            ->post(route('contract-articles.approve-contracts', $article))
            ->assertRedirect();

        $article->refresh();
        $this->assertSame(ContractArticle::APPROVAL_CONTRACTS_APPROVED, $article->approval_status);

        $this->actingAs($legal)
            ->post(route('contract-articles.approve-legal', $article))
            ->assertRedirect();

        $article->refresh();
        $this->assertSame(ContractArticle::APPROVAL_LEGAL_APPROVED, $article->approval_status);
        $this->assertSame(ContractArticle::STATUS_ACTIVE, $article->status);
    }

    public function test_article_restore_requires_super_admin(): void
    {
        $user = User::factory()->create();
        $user->givePermissionTo(['contract.manage']);

        $article = ContractArticle::create([
            'code' => 'GOV-ART-2',
            'serial' => 90002,
            'category' => ContractArticle::CATEGORY_MANDATORY,
            'status' => ContractArticle::STATUS_DRAFT,
            'approval_status' => ContractArticle::APPROVAL_NONE,
            'created_by_user_id' => $user->id,
            'updated_by_user_id' => $user->id,
        ]);

        $v1 = $article->versions()->create([
            'version_number' => 1,
            'title_ar' => 'ع',
            'title_en' => 'T',
            'content_ar' => 'a',
            'content_en' => 'e',
            'changed_by_user_id' => $user->id,
        ]);
        $article->update(['current_version_id' => $v1->id]);

        $this->actingAs($user)
            ->post(route('contract-articles.versions.restore', [$article, $v1]), ['change_summary' => 'x'])
            ->assertForbidden();
    }

    public function test_article_restore_by_super_admin_resets_governance_and_creates_new_version(): void
    {
        $super = User::factory()->create();
        $super->assignRole('super_admin');

        $article = ContractArticle::create([
            'code' => 'GOV-ART-3',
            'serial' => 90004,
            'category' => ContractArticle::CATEGORY_MANDATORY,
            'status' => ContractArticle::STATUS_ACTIVE,
            'approval_status' => ContractArticle::APPROVAL_LEGAL_APPROVED,
            'created_by_user_id' => $super->id,
            'updated_by_user_id' => $super->id,
        ]);

        $v1 = $article->versions()->create([
            'version_number' => 1,
            'title_ar' => 'قديم',
            'title_en' => 'Old',
            'content_ar' => 'أ',
            'content_en' => 'A',
            'changed_by_user_id' => $super->id,
        ]);
        $article->update(['current_version_id' => $v1->id]);

        $v2 = $article->versions()->create([
            'version_number' => 2,
            'title_ar' => 'جديد',
            'title_en' => 'New',
            'content_ar' => 'ب',
            'content_en' => 'B',
            'changed_by_user_id' => $super->id,
        ]);
        $article->update(['current_version_id' => $v2->id]);

        $this->actingAs($super)
            ->post(route('contract-articles.versions.restore', [$article, $v1]), ['change_summary' => 'rollback test'])
            ->assertRedirect();

        $article->refresh();
        $this->assertSame(ContractArticle::APPROVAL_NONE, $article->approval_status);
        $this->assertSame(ContractArticle::STATUS_DRAFT, $article->status);
        $this->assertSame(3, $article->versions()->count());
        $this->assertNotNull($article->current_version_id);
        $latest = $article->currentVersion;
        $this->assertNotNull($latest);
        $this->assertSame(3, $latest->version_number);
        $this->assertSame('Old', $latest->title_en);
    }

    public function test_template_legal_approval_creates_template_version(): void
    {
        $user = User::factory()->create();
        $user->givePermissionTo([
            'contract.manage',
            'contract.library.submit',
            'contract.library.approve_contracts',
            'contract.library.approve_legal',
        ]);

        $template = ContractTemplate::create([
            'code' => 'GOV-TPL-1',
            'name_en' => 'Gov Tpl',
            'name_ar' => 'قالب',
            'template_type' => ContractTemplate::TYPE_SUPPLY,
            'status' => ContractTemplate::STATUS_DRAFT,
            'approval_status' => ContractTemplate::APPROVAL_NONE,
            'created_by_user_id' => $user->id,
            'updated_by_user_id' => $user->id,
        ]);

        $article = ContractArticle::create([
            'code' => 'GOV-ART-T',
            'serial' => 90003,
            'category' => ContractArticle::CATEGORY_MANDATORY,
            'status' => ContractArticle::STATUS_ACTIVE,
            'approval_status' => ContractArticle::APPROVAL_LEGAL_APPROVED,
            'created_by_user_id' => $user->id,
            'updated_by_user_id' => $user->id,
        ]);

        $template->items()->create([
            'contract_article_id' => $article->id,
            'sort_order' => 1,
        ]);

        $this->actingAs($user)->post(route('contract-templates.submit-for-approval', $template))->assertRedirect();
        $this->actingAs($user)->post(route('contract-templates.approve-contracts', $template))->assertRedirect();
        $this->actingAs($user)->post(route('contract-templates.approve-legal', $template))->assertRedirect();

        $template->refresh();
        $this->assertSame(ContractTemplate::APPROVAL_LEGAL_APPROVED, $template->approval_status);
        $this->assertNotNull($template->current_template_version_id);
        $this->assertSame(1, $template->templateVersions()->count());
    }
}
