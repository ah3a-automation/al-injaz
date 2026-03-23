<?php

declare(strict_types=1);

namespace Tests\Feature\SupplierPortal;

use App\Application\Procurement\Services\CreateRfqFromPackageService;
use App\Models\BoqVersion;
use App\Models\ProcurementPackage;
use App\Models\Project;
use App\Models\ProjectBoqItem;
use App\Models\Rfq;
use App\Models\RfqSupplier;
use App\Models\RfqSupplierQuote;
use App\Models\RfqSupplierQuoteSnapshot;
use App\Models\Supplier;
use App\Models\User;
use App\Services\Procurement\RfqSupplierQuoteComparisonReadModelService;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

final class RfqSupplierQuoteSnapshotTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware(ValidateCsrfToken::class);
    }

    /**
     * @return array{supplierUser: User, supplier: Supplier, rfq: Rfq}
     */
    private function seedIssuedRfqWithInvitedSupplier(): array
    {
        Role::findOrCreate('supplier');

        $buyer = User::factory()->create();
        $supplierUser = User::factory()->create();

        $supplier = Supplier::create([
            'id' => (string) Str::uuid(),
            'supplier_code' => 'SUP-'.strtoupper(Str::random(8)),
            'legal_name_en' => 'Snapshot Supplier',
            'country' => 'SA',
            'city' => 'Riyadh',
            'status' => Supplier::STATUS_APPROVED,
            'is_verified' => true,
            'supplier_user_id' => $supplierUser->id,
        ]);

        $supplierUser->assignRole('supplier');

        $project = Project::create([
            'name' => 'Snapshot Project',
            'status' => 'active',
            'owner_user_id' => $buyer->id,
            'code' => 'SNP'.random_int(100, 999),
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
            'code' => 'ITM-SNAP',
            'description_en' => 'Snapshot item',
            'qty' => 2,
            'planned_cost' => 1000,
            'revenue_amount' => 1300,
            'unit' => 'pcs',
            'lead_type' => 'short',
        ]);

        $package = ProcurementPackage::create([
            'project_id' => $project->id,
            'package_no' => $project->code.'-PKG-SNAP',
            'name' => 'Snapshot Package',
            'currency' => 'SAR',
            'estimated_cost' => 1500,
            'estimated_revenue' => 2000,
            'status' => ProcurementPackage::STATUS_DRAFT,
            'created_by' => $buyer->id,
        ]);
        $package->boqItems()->attach([$boqItem->id]);

        $rfq = app(CreateRfqFromPackageService::class)->execute($package, [
            'title' => 'Snapshot RFQ',
            'submission_deadline' => now()->addDays(10)->toDateString(),
            'currency' => 'SAR',
            'supplier_ids' => [$supplier->id],
            'created_by' => $buyer->id,
        ]);

        $rfq->changeStatus(Rfq::STATUS_ISSUED, $buyer);

        return ['supplierUser' => $supplierUser, 'supplier' => $supplier, 'rfq' => $rfq->fresh()];
    }

    /**
     * @return array<string, array{unit_price: float, included_in_other: bool, notes: string}>
     */
    private function itemsPayload(Rfq $rfq, float $unitPrice): array
    {
        $rfq->load('items');
        $items = [];
        foreach ($rfq->items as $item) {
            $items[$item->id] = [
                'unit_price' => $unitPrice,
                'included_in_other' => false,
                'notes' => '',
            ];
        }

        return $items;
    }

    #[Test]
    public function first_submit_creates_version_1_snapshot_with_items(): void
    {
        $ctx = $this->seedIssuedRfqWithInvitedSupplier();
        $rfq = $ctx['rfq'];
        $rfq->load('items');

        $this->actingAs($ctx['supplierUser'])
            ->post(route('supplier.rfqs.quotes.submit', $rfq->id), [
                'items' => $this->itemsPayload($rfq, 50.0),
            ])
            ->assertRedirect(route('supplier.rfqs.show', $rfq->id));

        $tracker = RfqSupplierQuote::query()
            ->where('rfq_id', $rfq->id)
            ->where('supplier_id', $ctx['supplier']->id)
            ->firstOrFail();

        $this->assertSame(1, $tracker->revision_no);
        $this->assertNotNull($tracker->snapshot_data);

        $snapshots = RfqSupplierQuoteSnapshot::query()
            ->where('rfq_supplier_quote_id', $tracker->id)
            ->orderBy('revision_no')
            ->get();

        $this->assertCount(1, $snapshots);
        $this->assertSame(1, $snapshots[0]->revision_no);
        $data = $snapshots[0]->snapshot_data;
        $this->assertArrayHasKey('items', $data);
        $this->assertSame($rfq->id, $data['rfq_id']);
        $this->assertSame(1, $data['version_number']);
        $this->assertSame(1, $data['revision_no']);
        $this->assertArrayHasKey('comparison_schema_version', $data);
        $this->assertArrayHasKey('submission_summary', $data);
        $this->assertSame(1, $data['submission_summary']['priced_items_count']);
        $this->assertFalse($data['submission_summary']['has_partial_submission']);
        $this->assertNotEmpty($data['submitted_at']);

        $item0 = $data['items'][0];
        foreach (['rfq_item_id', 'code', 'description', 'qty', 'unit', 'estimated_cost', 'unit_price', 'total_price', 'included_in_other', 'remark', 'is_priced', 'pricing_state', 'sort_order'] as $k) {
            $this->assertArrayHasKey($k, $item0, 'Missing comparison-ready key: '.$k);
        }

        $normalized = app(RfqSupplierQuoteComparisonReadModelService::class)->normalizeForComparison($snapshots[0]);
        $this->assertSame($data['submission_summary']['quoted_total_amount'], $normalized['submission_summary']['quoted_total_amount']);
        $this->assertCount(count($data['items']), $normalized['lines']);
    }

    #[Test]
    public function resubmit_creates_second_snapshot_and_preserves_first_snapshot_data(): void
    {
        $ctx = $this->seedIssuedRfqWithInvitedSupplier();
        $rfq = $ctx['rfq'];

        $this->actingAs($ctx['supplierUser'])
            ->post(route('supplier.rfqs.quotes.submit', $rfq->id), [
                'items' => $this->itemsPayload($rfq, 10.0),
            ]);

        $tracker = RfqSupplierQuote::query()
            ->where('rfq_id', $rfq->id)
            ->where('supplier_id', $ctx['supplier']->id)
            ->firstOrFail();

        $first = RfqSupplierQuoteSnapshot::query()
            ->where('rfq_supplier_quote_id', $tracker->id)
            ->where('revision_no', 1)
            ->firstOrFail();
        $firstSnapshotJson = json_encode($first->snapshot_data);
        $firstId = $first->id;

        $this->actingAs($ctx['supplierUser'])
            ->post(route('supplier.rfqs.quotes.submit', $rfq->id), [
                'items' => $this->itemsPayload($rfq, 99.0),
            ]);

        $tracker->refresh();
        $this->assertSame(2, $tracker->revision_no);

        $all = RfqSupplierQuoteSnapshot::query()
            ->where('rfq_supplier_quote_id', $tracker->id)
            ->orderBy('revision_no')
            ->get();

        $this->assertCount(2, $all);

        $firstReloaded = RfqSupplierQuoteSnapshot::query()->findOrFail($firstId);
        $this->assertSame($firstSnapshotJson, json_encode($firstReloaded->snapshot_data));

        $second = $all->firstWhere('revision_no', 2);
        $this->assertNotNull($second);
        $items = $second->snapshot_data['items'] ?? [];
        $this->assertNotEmpty($items);
        $this->assertStringContainsString('99', (string) ($items[0]['unit_price'] ?? ''));
    }

    #[Test]
    public function draft_save_does_not_create_submission_snapshots(): void
    {
        $ctx = $this->seedIssuedRfqWithInvitedSupplier();
        $rfq = $ctx['rfq'];

        $this->actingAs($ctx['supplierUser'])
            ->post(route('supplier.rfqs.quotes.draft', $rfq->id), [
                'items' => $this->itemsPayload($rfq, 5.0),
            ])
            ->assertRedirect(route('supplier.rfqs.show', $rfq->id));

        $this->assertSame(0, RfqSupplierQuoteSnapshot::query()->count());
    }
}
