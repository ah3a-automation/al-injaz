<?php

declare(strict_types=1);

namespace Tests\Feature\SupplierPortal;

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
use Spatie\Permission\Models\Role;
use Tests\TestCase;

final class SupplierPortalRfqLargeItemsTest extends TestCase
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
    private function seedIssuedRfqWithBoqItemCount(int $boqItemCount): array
    {
        Role::findOrCreate('supplier');

        $buyer = User::factory()->create();
        $supplierUser = User::factory()->create();

        $supplier = Supplier::create([
            'id' => (string) Str::uuid(),
            'supplier_code' => 'SUP-'.strtoupper(Str::random(8)),
            'legal_name_en' => 'Large RFQ Supplier',
            'country' => 'SA',
            'city' => 'Riyadh',
            'status' => Supplier::STATUS_APPROVED,
            'is_verified' => true,
            'supplier_user_id' => $supplierUser->id,
        ]);

        $supplierUser->assignRole('supplier');

        $project = Project::create([
            'name' => 'Large RFQ Project',
            'status' => 'active',
            'owner_user_id' => $buyer->id,
            'code' => 'LRQ'.random_int(100, 999),
            'currency' => 'SAR',
        ]);

        $boqVersion = BoqVersion::create([
            'project_id' => $project->id,
            'version_no' => 1,
            'status' => 'active',
            'imported_by' => $buyer->id,
        ]);

        $boqIds = [];
        for ($i = 0; $i < $boqItemCount; $i++) {
            $boqIds[] = ProjectBoqItem::create([
                'project_id' => $project->id,
                'boq_version_id' => $boqVersion->id,
                'code' => 'ITM-L'.$i,
                'description_en' => 'Large item '.$i,
                'qty' => 1,
                'planned_cost' => 100,
                'revenue_amount' => 120,
                'unit' => 'pcs',
                'lead_type' => 'short',
            ])->id;
        }

        $package = ProcurementPackage::create([
            'project_id' => $project->id,
            'package_no' => $project->code.'-PKG-LRG',
            'name' => 'Large Package',
            'currency' => 'SAR',
            'estimated_cost' => 1500,
            'estimated_revenue' => 2000,
            'status' => ProcurementPackage::STATUS_DRAFT,
            'created_by' => $buyer->id,
        ]);
        $package->boqItems()->attach($boqIds);

        $rfq = app(CreateRfqFromPackageService::class)->execute($package, [
            'title' => 'Large RFQ',
            'submission_deadline' => now()->addDays(10)->toDateString(),
            'currency' => 'SAR',
            'supplier_ids' => [$supplier->id],
            'created_by' => $buyer->id,
        ]);

        $rfq->changeStatus(Rfq::STATUS_ISSUED, $buyer);

        return ['buyer' => $buyer, 'supplierUser' => $supplierUser, 'supplier' => $supplier, 'rfq' => $rfq->fresh(['items'])];
    }

    #[Test]
    public function large_rfq_show_enables_chunking_props_and_full_item_list(): void
    {
        $ctx = $this->seedIssuedRfqWithBoqItemCount(52);
        $rfq = $ctx['rfq'];

        $threshold = (int) config('supplier_portal.rfq_quote_items.chunk_threshold', 50);
        $this->assertGreaterThan($threshold, $rfq->items->count());

        $this->actingAs($ctx['supplierUser'])
            ->get(route('supplier.rfqs.show', $rfq->id))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('SupplierPortal/Rfqs/Show')
                ->where('quote_items_chunking_active', true)
                ->where('quote_items_chunk_threshold', $threshold)
                ->where('quote_items_chunk_size', (int) config('supplier_portal.rfq_quote_items.chunk_size', 25))
                ->has('rfq.items', 52));
    }

    #[Test]
    public function large_rfq_draft_save_persists_all_item_rows(): void
    {
        $ctx = $this->seedIssuedRfqWithBoqItemCount(52);
        $rfq = $ctx['rfq'];

        $itemsPayload = [];
        foreach ($rfq->items as $index => $item) {
            $itemsPayload[$item->id] = [
                'unit_price' => 10 + $index,
                'included_in_other' => false,
                'notes' => 'n'.$index,
            ];
        }

        $this->actingAs($ctx['supplierUser'])
            ->post(route('supplier.rfqs.quotes.draft', $rfq->id), ['items' => $itemsPayload])
            ->assertRedirect(route('supplier.rfqs.show', $rfq->id));

        $quote = RfqQuote::query()
            ->where('rfq_id', $rfq->id)
            ->where('supplier_id', $ctx['supplier']->id)
            ->with('items')
            ->firstOrFail();

        $this->assertCount(52, $quote->items);

        foreach ($rfq->items as $index => $item) {
            $line = $quote->items->firstWhere('rfq_item_id', $item->id);
            $this->assertNotNull($line);
            $this->assertEqualsWithDelta((float) (10 + $index), (float) $line->unit_price, 0.0001);
            $this->assertSame('n'.$index, $line->notes ?? '');
        }
    }

    #[Test]
    public function large_rfq_submission_includes_all_items(): void
    {
        $ctx = $this->seedIssuedRfqWithBoqItemCount(52);
        $rfq = $ctx['rfq'];

        $itemsPayload = [];
        foreach ($rfq->items as $index => $item) {
            $itemsPayload[$item->id] = [
                'unit_price' => 5,
                'included_in_other' => false,
                'notes' => '',
            ];
        }

        $this->actingAs($ctx['supplierUser'])
            ->post(route('supplier.rfqs.quotes.submit', $rfq->id), ['items' => $itemsPayload])
            ->assertRedirect(route('supplier.rfqs.show', $rfq->id));

        $quote = RfqQuote::query()
            ->where('rfq_id', $rfq->id)
            ->where('supplier_id', $ctx['supplier']->id)
            ->firstOrFail();

        $this->assertSame(52, $quote->items()->count());
    }
}
