<?php

declare(strict_types=1);

namespace Tests\Feature\Rfq;

use App\Application\Procurement\Services\CreateRfqFromPackageService;
use App\Models\BoqVersion;
use App\Models\ProcurementPackage;
use App\Models\Project;
use App\Models\ProjectBoqItem;
use App\Models\Rfq;
use App\Models\RfqQuote;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

final class RfqSupplierQuoteShowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware(ValidateCsrfToken::class);
    }

    /**
     * @return array{buyer: User, supplierUser: User, supplier: Supplier, rfq: Rfq, quote: RfqQuote}
     */
    private function seedIssuedRfqWithSubmittedQuote(): array
    {
        Role::findOrCreate('supplier');

        $buyer = User::factory()->create();
        $supplierUser = User::factory()->create();

        $supplier = Supplier::create([
            'id' => (string) Str::uuid(),
            'supplier_code' => 'SUP-'.strtoupper(Str::random(8)),
            'legal_name_en' => 'Quote Show Supplier',
            'country' => 'SA',
            'city' => 'Riyadh',
            'status' => Supplier::STATUS_APPROVED,
            'is_verified' => true,
            'supplier_user_id' => $supplierUser->id,
        ]);

        $supplierUser->assignRole('supplier');

        $project = Project::create([
            'name' => 'Quote Show Project',
            'status' => 'active',
            'owner_user_id' => $buyer->id,
            'code' => 'QS'.random_int(100, 999),
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
            'code' => 'ITM-QS',
            'description_en' => 'Item one',
            'qty' => 2,
            'planned_cost' => 1000,
            'revenue_amount' => 1300,
            'unit' => 'pcs',
            'lead_type' => 'short',
        ]);

        $package = ProcurementPackage::create([
            'project_id' => $project->id,
            'package_no' => $project->code.'-PKG-QS',
            'name' => 'Quote Show Package',
            'currency' => 'SAR',
            'estimated_cost' => 1500,
            'estimated_revenue' => 2000,
            'status' => ProcurementPackage::STATUS_DRAFT,
            'created_by' => $buyer->id,
        ]);
        $package->boqItems()->attach([$boqItem->id]);

        $rfq = app(CreateRfqFromPackageService::class)->execute($package, [
            'title' => 'Quote Show RFQ',
            'submission_deadline' => now()->addDays(10)->toDateString(),
            'currency' => 'SAR',
            'supplier_ids' => [$supplier->id],
            'created_by' => $buyer->id,
        ]);

        $rfq->changeStatus(Rfq::STATUS_ISSUED, $buyer);

        $rfq = $rfq->fresh();
        $rfq->load('items');

        $itemsPayload = [];
        foreach ($rfq->items as $item) {
            $itemsPayload[$item->id] = [
                'unit_price' => 50.0,
                'included_in_other' => false,
                'notes' => '',
            ];
        }

        $this->actingAs($supplierUser)
            ->post(route('supplier.rfqs.quotes.submit', $rfq->id), [
                'items' => $itemsPayload,
            ]);

        $quote = RfqQuote::query()
            ->where('rfq_id', $rfq->id)
            ->where('supplier_id', $supplier->id)
            ->firstOrFail();

        return ['buyer' => $buyer, 'supplierUser' => $supplierUser, 'supplier' => $supplier, 'rfq' => $rfq->fresh(), 'quote' => $quote];
    }

    #[Test]
    public function user_with_rfq_view_can_open_supplier_quote_detail_page(): void
    {
        $ctx = $this->seedIssuedRfqWithSubmittedQuote();
        Permission::findOrCreate('rfq.view');
        $ctx['buyer']->givePermissionTo('rfq.view');

        /** @var RfqQuote $quote */
        $quote = $ctx['quote'];

        $this->actingAs($ctx['buyer'])
            ->get(route('rfqs.quotes.show', [$ctx['rfq']->id, $quote->id]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Rfqs/Quotes/Show')
                ->has('quote.lines')
                ->has('quote.attachments'));
    }

    #[Test]
    public function user_without_rfq_view_cannot_open_supplier_quote_detail_page(): void
    {
        $ctx = $this->seedIssuedRfqWithSubmittedQuote();
        $other = User::factory()->create();

        /** @var RfqQuote $quote */
        $quote = $ctx['quote'];

        $this->actingAs($other)
            ->get(route('rfqs.quotes.show', [$ctx['rfq']->id, $quote->id]))
            ->assertForbidden();
    }

    #[Test]
    public function quote_from_another_rfq_returns_404(): void
    {
        $ctxA = $this->seedIssuedRfqWithSubmittedQuote();
        $ctxB = $this->seedIssuedRfqWithSubmittedQuote();

        Permission::findOrCreate('rfq.view');
        $ctxA['buyer']->givePermissionTo('rfq.view');

        /** @var RfqQuote $quoteB */
        $quoteB = $ctxB['quote'];

        $this->actingAs($ctxA['buyer'])
            ->get(route('rfqs.quotes.show', [$ctxA['rfq']->id, $quoteB->id]))
            ->assertNotFound();
    }
}
