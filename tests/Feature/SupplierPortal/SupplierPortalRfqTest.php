<?php

declare(strict_types=1);

namespace Tests\Feature\SupplierPortal;

use App\Application\Procurement\Services\CreateRfqFromPackageService;
use App\Models\BoqVersion;
use App\Models\ProcurementPackage;
use App\Models\Project;
use App\Models\ProjectBoqItem;
use App\Models\Rfq;
use App\Models\RfqClarification;
use App\Models\RfqSupplier;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

final class SupplierPortalRfqTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware(ValidateCsrfToken::class);
    }

    /**
     * @return array{buyer: User, supplierUser: User, supplier: Supplier, rfq: Rfq}
     */
    private function seedIssuedRfqWithInvitedSupplier(): array
    {
        Role::findOrCreate('supplier');

        $buyer = User::factory()->create();
        $supplierUser = User::factory()->create();

        $supplier = Supplier::create([
            'id' => (string) Str::uuid(),
            'supplier_code' => 'SUP-'.strtoupper(Str::random(8)),
            'legal_name_en' => 'Portal Supplier',
            'country' => 'SA',
            'city' => 'Riyadh',
            'status' => Supplier::STATUS_APPROVED,
            'is_verified' => true,
            'supplier_user_id' => $supplierUser->id,
        ]);

        $supplierUser->assignRole('supplier');

        $project = Project::create([
            'name' => 'Portal Project',
            'status' => 'active',
            'owner_user_id' => $buyer->id,
            'code' => 'PRT'.random_int(100, 999),
            'currency' => 'SAR',
        ]);

        $boqVersion = BoqVersion::create([
            'project_id' => $project->id,
            'version_no' => 1,
            'status' => 'active',
            'imported_by' => $buyer->id,
        ]);

        $boqItem = ProjectBoqItem::create([
            'project_id' => $project->id,
            'boq_version_id' => $boqVersion->id,
            'code' => 'ITM-1',
            'description_en' => 'Item one',
            'qty' => 2,
            'planned_cost' => 1000,
            'revenue_amount' => 1300,
            'unit' => 'pcs',
            'lead_type' => 'short',
        ]);

        $package = ProcurementPackage::create([
            'project_id' => $project->id,
            'package_no' => $project->code.'-PKG-001',
            'name' => 'Portal Package',
            'currency' => 'SAR',
            'estimated_cost' => 1500,
            'estimated_revenue' => 2000,
            'status' => ProcurementPackage::STATUS_DRAFT,
            'created_by' => $buyer->id,
        ]);
        $package->boqItems()->attach([$boqItem->id]);

        $rfq = app(CreateRfqFromPackageService::class)->execute($package, [
            'title' => 'Portal RFQ',
            'submission_deadline' => now()->addDays(10)->toDateString(),
            'currency' => 'SAR',
            'supplier_ids' => [$supplier->id],
            'created_by' => $buyer->id,
        ]);

        $rfq->changeStatus(Rfq::STATUS_ISSUED, $buyer);

        return ['buyer' => $buyer, 'supplierUser' => $supplierUser, 'supplier' => $supplier, 'rfq' => $rfq->fresh()];
    }

    #[Test]
    public function invited_supplier_can_view_rfq_show(): void
    {
        $ctx = $this->seedIssuedRfqWithInvitedSupplier();

        $this->actingAs($ctx['supplierUser'])
            ->get(route('supplier.rfqs.show', $ctx['rfq']->id))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('SupplierPortal/Rfqs/Show')
                ->where('can_submit_quote', true)
                ->where('can_ask_clarification', true)
                ->has('rfq_documents')
                ->has('supplier_quote_attachments')
                ->has('submission_state'));
    }

    #[Test]
    public function supplier_rfqs_index_only_includes_invited_rfqs(): void
    {
        $ctx = $this->seedIssuedRfqWithInvitedSupplier();

        Role::findOrCreate('supplier');

        $otherSupplier = Supplier::create([
            'id' => (string) Str::uuid(),
            'supplier_code' => 'SUP-IDX'.strtoupper(Str::random(4)),
            'legal_name_en' => 'Index Other Supplier',
            'country' => 'SA',
            'city' => 'Jeddah',
            'status' => Supplier::STATUS_APPROVED,
            'is_verified' => true,
            'supplier_user_id' => null,
        ]);

        $buyer = User::factory()->create();
        $project = Project::create([
            'name' => 'Other Project',
            'status' => 'active',
            'owner_user_id' => $buyer->id,
            'code' => 'OTH'.random_int(100, 999),
            'currency' => 'SAR',
        ]);
        $boqVersion = BoqVersion::create([
            'project_id' => $project->id,
            'version_no' => 1,
            'status' => 'active',
            'imported_by' => $buyer->id,
        ]);
        $boqItem = ProjectBoqItem::create([
            'project_id' => $project->id,
            'boq_version_id' => $boqVersion->id,
            'code' => 'ITM-X',
            'description_en' => 'Other item',
            'qty' => 1,
            'planned_cost' => 100,
            'revenue_amount' => 120,
            'unit' => 'pcs',
            'lead_type' => 'short',
        ]);
        $package = ProcurementPackage::create([
            'project_id' => $project->id,
            'package_no' => $project->code.'-PKG-099',
            'name' => 'Other Package',
            'currency' => 'SAR',
            'estimated_cost' => 100,
            'estimated_revenue' => 120,
            'status' => ProcurementPackage::STATUS_DRAFT,
            'created_by' => $buyer->id,
        ]);
        $package->boqItems()->attach([$boqItem->id]);

        $otherRfq = app(CreateRfqFromPackageService::class)->execute($package, [
            'title' => 'RFQ for other supplier only',
            'submission_deadline' => now()->addDays(5)->toDateString(),
            'currency' => 'SAR',
            'supplier_ids' => [$otherSupplier->id],
            'created_by' => $buyer->id,
        ]);
        $otherRfq->changeStatus(Rfq::STATUS_ISSUED, $buyer);

        $this->actingAs($ctx['supplierUser'])
            ->get(route('supplier.rfqs.index', ['tab' => 'open']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('SupplierPortal/Rfqs/Index')
                ->has('rfqs.data', 1)
                ->where('rfqs.data.0.id', $ctx['rfq']->id));
    }

    #[Test]
    public function non_invited_supplier_cannot_view_rfq_show(): void
    {
        $ctx = $this->seedIssuedRfqWithInvitedSupplier();

        Role::findOrCreate('supplier');

        $otherUser = User::factory()->create();
        $otherSupplier = Supplier::create([
            'id' => (string) Str::uuid(),
            'supplier_code' => 'SUP-OTHER'.strtoupper(Str::random(4)),
            'legal_name_en' => 'Other Supplier',
            'country' => 'SA',
            'city' => 'Jeddah',
            'status' => Supplier::STATUS_APPROVED,
            'is_verified' => true,
            'supplier_user_id' => $otherUser->id,
        ]);
        $otherUser->assignRole('supplier');

        $this->actingAs($otherUser)
            ->get(route('supplier.rfqs.show', $ctx['rfq']->id))
            ->assertForbidden();
    }

    #[Test]
    public function supplier_cannot_post_quote_when_rfq_not_accepting_responses(): void
    {
        $ctx = $this->seedIssuedRfqWithInvitedSupplier();
        $rfq = $ctx['rfq'];
        $buyer = $ctx['buyer'];

        $rfq->changeStatus(Rfq::STATUS_UNDER_EVALUATION, $buyer);

        $rfq->load('items');
        $items = [];
        foreach ($rfq->items as $item) {
            $items[$item->id] = [
                'unit_price' => 10,
                'total_price' => 20,
                'notes' => '',
            ];
        }

        $this->actingAs($ctx['supplierUser'])
            ->from(route('supplier.rfqs.show', $rfq->id))
            ->post(route('supplier.rfqs.quotes.store', $rfq->id), ['items' => $items])
            ->assertRedirect(route('supplier.rfqs.show', $rfq->id))
            ->assertSessionHasErrors('items');
    }

    #[Test]
    public function clarifications_json_excludes_private_questions_from_other_suppliers(): void
    {
        $ctx = $this->seedIssuedRfqWithInvitedSupplier();
        $rfq = $ctx['rfq'];
        $supplierA = $ctx['supplier'];

        Role::findOrCreate('supplier');

        $userB = User::factory()->create();
        $supplierB = Supplier::create([
            'id' => (string) Str::uuid(),
            'supplier_code' => 'SUP-B'.strtoupper(Str::random(4)),
            'legal_name_en' => 'Supplier B',
            'country' => 'SA',
            'city' => 'Dammam',
            'status' => Supplier::STATUS_APPROVED,
            'is_verified' => true,
            'supplier_user_id' => $userB->id,
        ]);
        $userB->assignRole('supplier');

        $rfqSupplierB = new RfqSupplier([
            'rfq_id' => $rfq->id,
            'supplier_id' => $supplierB->id,
            'status' => 'invited',
            'invited_at' => now(),
            'invited_by' => $ctx['buyer']->id,
            'on_vendor_list' => false,
        ]);
        $rfqSupplierB->id = (string) Str::uuid();
        $rfqSupplierB->save();

        RfqClarification::create([
            'rfq_id' => $rfq->id,
            'supplier_id' => $supplierA->id,
            'question' => 'Private to A',
            'answer' => null,
            'status' => RfqClarification::STATUS_OPEN,
            'visibility' => RfqClarification::VISIBILITY_PRIVATE,
        ]);

        RfqClarification::create([
            'rfq_id' => $rfq->id,
            'supplier_id' => null,
            'question' => 'Public question',
            'answer' => null,
            'status' => RfqClarification::STATUS_OPEN,
            'visibility' => RfqClarification::VISIBILITY_PUBLIC,
        ]);

        $res = $this->actingAs($userB)
            ->getJson(route('supplier.rfqs.clarifications', $rfq->id))
            ->assertOk()
            ->json('clarifications');

        $questions = collect($res)->pluck('question')->all();
        $this->assertContains('Public question', $questions);
        $this->assertNotContains('Private to A', $questions);
    }

    #[Test]
    public function clarification_post_returns_validation_error_when_rfq_not_accepting_questions(): void
    {
        $ctx = $this->seedIssuedRfqWithInvitedSupplier();
        $rfq = $ctx['rfq'];
        $buyer = $ctx['buyer'];

        $rfq->changeStatus(Rfq::STATUS_UNDER_EVALUATION, $buyer);

        $this->actingAs($ctx['supplierUser'])
            ->from(route('supplier.rfqs.show', $rfq->id))
            ->post(route('supplier.rfqs.clarifications.store', $rfq->id), [
                'question' => 'Too late?',
            ])
            ->assertRedirect()
            ->assertSessionHasErrors('question');
    }
}
