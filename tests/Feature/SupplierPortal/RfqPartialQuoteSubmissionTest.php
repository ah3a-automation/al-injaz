<?php

declare(strict_types=1);

namespace Tests\Feature\SupplierPortal;

use App\Application\Procurement\Services\CreateRfqFromPackageService;
use App\Application\Procurement\Services\RfqQuoteLineResolver;
use App\Models\BoqVersion;
use App\Models\ProcurementPackage;
use App\Models\Project;
use App\Models\ProjectBoqItem;
use App\Models\Rfq;
use App\Models\RfqQuoteItem;
use App\Models\RfqSupplierQuoteSnapshot;
use App\Models\Supplier;
use App\Services\Procurement\RfqSupplierQuoteComparisonReadModelService;
use App\Models\User;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

final class RfqPartialQuoteSubmissionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware(ValidateCsrfToken::class);
    }

    /**
     * @return array{supplierUser: User, supplier: Supplier, rfq: Rfq, itemIds: array{0: string, 1: string}}
     */
    private function seedIssuedRfqWithTwoItems(): array
    {
        Role::findOrCreate('supplier');

        $buyer = User::factory()->create();
        $supplierUser = User::factory()->create();

        $supplier = Supplier::create([
            'id' => (string) Str::uuid(),
            'supplier_code' => 'SUP-'.strtoupper(Str::random(8)),
            'legal_name_en' => 'Partial Supplier',
            'country' => 'SA',
            'city' => 'Riyadh',
            'status' => Supplier::STATUS_APPROVED,
            'is_verified' => true,
            'supplier_user_id' => $supplierUser->id,
        ]);

        $supplierUser->assignRole('supplier');

        $project = Project::create([
            'name' => 'Partial Project',
            'status' => 'active',
            'owner_user_id' => $buyer->id,
            'code' => 'PAR'.random_int(100, 999),
            'currency' => 'SAR',
        ]);

        $boqVersion = BoqVersion::create([
            'project_id' => $project->id,
            'version_no' => 1,
            'status' => 'active',
            'imported_by' => $buyer->id,
        ]);

        $boqItemA = ProjectBoqItem::create([
            'project_id' => $project->id,
            'boq_version_id' => $boqVersion->id,
            'code' => 'ITM-A',
            'description_en' => 'Item A',
            'qty' => 2,
            'planned_cost' => 1000,
            'revenue_amount' => 1300,
            'unit' => 'pcs',
            'lead_type' => 'short',
        ]);
        $boqItemB = ProjectBoqItem::create([
            'project_id' => $project->id,
            'boq_version_id' => $boqVersion->id,
            'code' => 'ITM-B',
            'description_en' => 'Item B',
            'qty' => 1,
            'planned_cost' => 500,
            'revenue_amount' => 600,
            'unit' => 'pcs',
            'lead_type' => 'short',
        ]);

        $package = ProcurementPackage::create([
            'project_id' => $project->id,
            'package_no' => $project->code.'-PKG-PAR',
            'name' => 'Partial Package',
            'currency' => 'SAR',
            'estimated_cost' => 1500,
            'estimated_revenue' => 2000,
            'status' => ProcurementPackage::STATUS_DRAFT,
            'created_by' => $buyer->id,
        ]);
        $package->boqItems()->attach([$boqItemA->id, $boqItemB->id]);

        $rfq = app(CreateRfqFromPackageService::class)->execute($package, [
            'title' => 'Partial RFQ',
            'submission_deadline' => now()->addDays(10)->toDateString(),
            'currency' => 'SAR',
            'supplier_ids' => [$supplier->id],
            'created_by' => $buyer->id,
        ]);

        $rfq->changeStatus(Rfq::STATUS_ISSUED, $buyer);
        $rfq = $rfq->fresh(['items']);
        $items = $rfq->items->sortBy('sort_order')->values();
        $itemIds = [$items[0]->id, $items[1]->id];

        return ['supplierUser' => $supplierUser, 'supplier' => $supplier, 'rfq' => $rfq, 'itemIds' => $itemIds];
    }

    #[Test]
    public function partial_submission_persists_null_prices_on_unpriced_lines(): void
    {
        $ctx = $this->seedIssuedRfqWithTwoItems();
        $rfq = $ctx['rfq'];
        [$idA, $idB] = $ctx['itemIds'];

        $this->actingAs($ctx['supplierUser'])
            ->post(route('supplier.rfqs.quotes.submit', $rfq->id), [
                'items' => [
                    $idA => [
                        'unit_price' => 25,
                        'included_in_other' => false,
                        'notes' => 'priced',
                    ],
                    $idB => [
                        'unit_price' => null,
                        'included_in_other' => false,
                        'notes' => 'later',
                    ],
                ],
            ])
            ->assertRedirect(route('supplier.rfqs.show', $rfq->id));

        $lines = RfqQuoteItem::query()
            ->whereHas('rfqQuote', fn ($q) => $q->where('rfq_id', $rfq->id)->where('supplier_id', $ctx['supplier']->id))
            ->orderBy('created_at')
            ->get();

        $this->assertCount(2, $lines);
        $lineA = $lines->firstWhere('rfq_item_id', $idA);
        $lineB = $lines->firstWhere('rfq_item_id', $idB);
        $this->assertNotNull($lineA);
        $this->assertNotNull($lineB);
        $this->assertSame('25.0000', (string) $lineA->unit_price);
        $this->assertSame('50.0000', (string) $lineA->total_price);
        $this->assertNull($lineB->unit_price);
        $this->assertNull($lineB->total_price);
    }

    #[Test]
    public function included_line_has_zero_total_while_other_line_unpriced(): void
    {
        $ctx = $this->seedIssuedRfqWithTwoItems();
        $rfq = $ctx['rfq'];
        [$idA, $idB] = $ctx['itemIds'];

        $this->actingAs($ctx['supplierUser'])
            ->post(route('supplier.rfqs.quotes.submit', $rfq->id), [
                'items' => [
                    $idA => [
                        'unit_price' => 0,
                        'included_in_other' => true,
                        'notes' => '',
                    ],
                    $idB => [
                        'unit_price' => null,
                        'included_in_other' => false,
                        'notes' => '',
                    ],
                ],
            ])
            ->assertRedirect(route('supplier.rfqs.show', $rfq->id));

        $lines = RfqQuoteItem::query()
            ->whereHas('rfqQuote', fn ($q) => $q->where('rfq_id', $rfq->id)->where('supplier_id', $ctx['supplier']->id))
            ->get();

        $lineA = $lines->firstWhere('rfq_item_id', $idA);
        $lineB = $lines->firstWhere('rfq_item_id', $idB);
        $this->assertTrue($lineA->included_in_other);
        $this->assertSame('0.0000', (string) $lineA->total_price);
        $this->assertNull($lineB->unit_price);
        $this->assertNull($lineB->total_price);
    }

    #[Test]
    public function rfq_show_includes_quote_submission_summary(): void
    {
        $ctx = $this->seedIssuedRfqWithTwoItems();
        $rfq = $ctx['rfq'];
        [$idA, $idB] = $ctx['itemIds'];

        $this->actingAs($ctx['supplierUser'])
            ->post(route('supplier.rfqs.quotes.submit', $rfq->id), [
                'items' => [
                    $idA => ['unit_price' => 10, 'included_in_other' => false, 'notes' => ''],
                    $idB => ['unit_price' => null, 'included_in_other' => false, 'notes' => ''],
                ],
            ]);

        $this->actingAs($ctx['supplierUser'])
            ->get(route('supplier.rfqs.show', $rfq->id))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('quote_submission_summary.total_items', 2)
                ->where('quote_submission_summary.priced_items_count', 1)
                ->where('quote_submission_summary.unpriced_items_count', 1)
                ->where('quote_submission_summary.included_items_count', 0)
                ->where('quote_submission_summary.total_quotation_amount', 20));
    }

    #[Test]
    public function partial_submission_snapshot_exposes_comparison_summary_and_included_line(): void
    {
        $ctx = $this->seedIssuedRfqWithTwoItems();
        $rfq = $ctx['rfq'];
        [$idA, $idB] = $ctx['itemIds'];

        $this->actingAs($ctx['supplierUser'])
            ->post(route('supplier.rfqs.quotes.submit', $rfq->id), [
                'items' => [
                    $idA => [
                        'unit_price' => 25,
                        'included_in_other' => false,
                        'notes' => 'priced',
                    ],
                    $idB => [
                        'unit_price' => null,
                        'included_in_other' => false,
                        'notes' => 'later',
                    ],
                ],
            ])
            ->assertRedirect(route('supplier.rfqs.show', $rfq->id));

        $snapshot = RfqSupplierQuoteSnapshot::query()->firstOrFail();
        $sum = $snapshot->snapshot_data['submission_summary'];
        $this->assertTrue($sum['has_partial_submission']);
        $this->assertSame(1, $sum['priced_items_count']);
        $this->assertSame(1, $sum['unpriced_items_count']);
        $this->assertSame(0, $sum['included_items_count']);
        $this->assertSame(50.0, $sum['quoted_total_amount']);

        $lines = $snapshot->snapshot_data['items'];
        $lineB = collect($lines)->firstWhere('rfq_item_id', $idB);
        $this->assertNotNull($lineB);
        $this->assertSame(RfqQuoteLineResolver::STATE_UNPRICED, $lineB['pricing_state'] ?? null);
        $this->assertFalse($lineB['included_in_other']);

        $read = app(RfqSupplierQuoteComparisonReadModelService::class)->normalizeForComparison($snapshot);
        $this->assertTrue($read['submission_summary']['has_partial_submission']);
        $this->assertCount(2, $read['lines']);
    }

    #[Test]
    public function included_and_unpriced_snapshot_marks_partial_and_counts_included(): void
    {
        $ctx = $this->seedIssuedRfqWithTwoItems();
        $rfq = $ctx['rfq'];
        [$idA, $idB] = $ctx['itemIds'];

        $this->actingAs($ctx['supplierUser'])
            ->post(route('supplier.rfqs.quotes.submit', $rfq->id), [
                'items' => [
                    $idA => [
                        'unit_price' => 0,
                        'included_in_other' => true,
                        'notes' => '',
                    ],
                    $idB => [
                        'unit_price' => null,
                        'included_in_other' => false,
                        'notes' => '',
                    ],
                ],
            ])
            ->assertRedirect(route('supplier.rfqs.show', $rfq->id));

        $snapshot = RfqSupplierQuoteSnapshot::query()->firstOrFail();
        $sum = $snapshot->snapshot_data['submission_summary'];
        $this->assertTrue($sum['has_partial_submission']);
        $this->assertSame(0, $sum['priced_items_count']);
        $this->assertSame(1, $sum['included_items_count']);
        $this->assertSame(1, $sum['unpriced_items_count']);
        $this->assertSame(0.0, $sum['quoted_total_amount']);

        $lines = $snapshot->snapshot_data['items'];
        $lineA = collect($lines)->firstWhere('rfq_item_id', $idA);
        $this->assertNotNull($lineA);
        $this->assertTrue($lineA['included_in_other']);
        $this->assertSame(RfqQuoteLineResolver::STATE_INCLUDED, $lineA['pricing_state']);
    }
}
