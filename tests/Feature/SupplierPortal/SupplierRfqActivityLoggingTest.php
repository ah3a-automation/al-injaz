<?php

declare(strict_types=1);

namespace Tests\Feature\SupplierPortal;

use App\Application\Procurement\Services\CreateRfqFromPackageService;
use App\Models\BoqVersion;
use App\Models\ProcurementPackage;
use App\Models\Project;
use App\Models\ProjectBoqItem;
use App\Models\Rfq;
use App\Models\RfqActivity;
use App\Models\RfqQuote;
use App\Models\Supplier;
use App\Models\User;
use App\Services\Procurement\SupplierRfqActivityLogger;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

final class SupplierRfqActivityLoggingTest extends TestCase
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
            'legal_name_en' => 'Activity Supplier',
            'country' => 'SA',
            'city' => 'Riyadh',
            'status' => Supplier::STATUS_APPROVED,
            'is_verified' => true,
            'supplier_user_id' => $supplierUser->id,
        ]);

        $supplierUser->assignRole('supplier');

        $project = Project::create([
            'name' => 'Activity Project',
            'status' => 'active',
            'owner_user_id' => $buyer->id,
            'code' => 'ACT'.random_int(100, 999),
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
            'code' => 'ITM-ACT',
            'description_en' => 'Activity item',
            'qty' => 2,
            'planned_cost' => 1000,
            'revenue_amount' => 1300,
            'unit' => 'pcs',
            'lead_type' => 'short',
        ]);

        $package = ProcurementPackage::create([
            'project_id' => $project->id,
            'package_no' => $project->code.'-PKG-ACT',
            'name' => 'Activity Package',
            'currency' => 'SAR',
            'estimated_cost' => 1500,
            'estimated_revenue' => 2000,
            'status' => ProcurementPackage::STATUS_DRAFT,
            'created_by' => $buyer->id,
        ]);
        $package->boqItems()->attach([$boqItem->id]);

        $rfq = app(CreateRfqFromPackageService::class)->execute($package, [
            'title' => 'Activity RFQ',
            'submission_deadline' => now()->addDays(10)->toDateString(),
            'currency' => 'SAR',
            'supplier_ids' => [$supplier->id],
            'created_by' => $buyer->id,
        ]);

        $rfq->changeStatus(Rfq::STATUS_ISSUED, $buyer);

        return ['supplierUser' => $supplierUser, 'supplier' => $supplier, 'rfq' => $rfq->fresh()];
    }

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
    public function first_rfq_show_logs_supplier_rfq_viewed_once(): void
    {
        $ctx = $this->seedIssuedRfqWithInvitedSupplier();
        $rfq = $ctx['rfq'];

        $this->actingAs($ctx['supplierUser'])
            ->get(route('supplier.rfqs.show', $rfq->id))
            ->assertOk();

        $this->actingAs($ctx['supplierUser'])
            ->get(route('supplier.rfqs.show', $rfq->id))
            ->assertOk();

        $this->assertSame(
            1,
            RfqActivity::query()
                ->where('rfq_id', $rfq->id)
                ->where('activity_type', SupplierRfqActivityLogger::TYPE_RFQ_VIEWED)
                ->count()
        );

        $viewAct = RfqActivity::query()
            ->where('rfq_id', $rfq->id)
            ->where('activity_type', SupplierRfqActivityLogger::TYPE_RFQ_VIEWED)
            ->first();
        $this->assertNotNull($viewAct);
        $this->assertSame('supplier_portal', $viewAct->metadata['source'] ?? null);
    }

    #[Test]
    public function draft_save_logs_supplier_quote_draft_saved(): void
    {
        $ctx = $this->seedIssuedRfqWithInvitedSupplier();
        $rfq = $ctx['rfq'];
        $rfq->load('items');

        $this->actingAs($ctx['supplierUser'])
            ->post(route('supplier.rfqs.quotes.draft', $rfq->id), [
                'items' => $this->itemsPayload($rfq, 5.0),
            ])
            ->assertRedirect();

        $act = RfqActivity::query()
            ->where('rfq_id', $rfq->id)
            ->where('activity_type', SupplierRfqActivityLogger::TYPE_QUOTE_DRAFT_SAVED)
            ->first();

        $this->assertNotNull($act);
        $meta = $act->metadata;
        $this->assertSame($ctx['supplier']->id, $meta['supplier_id'] ?? null);
        $this->assertSame('supplier_portal', $meta['source'] ?? null);
        $this->assertArrayHasKey('priced_items_count', $meta);
    }

    #[Test]
    public function submit_logs_supplier_quote_submitted_with_version_one(): void
    {
        $ctx = $this->seedIssuedRfqWithInvitedSupplier();
        $rfq = $ctx['rfq'];
        $rfq->load('items');

        $this->actingAs($ctx['supplierUser'])
            ->post(route('supplier.rfqs.quotes.submit', $rfq->id), [
                'items' => $this->itemsPayload($rfq, 10.0),
            ]);

        $act = RfqActivity::query()
            ->where('rfq_id', $rfq->id)
            ->where('activity_type', SupplierRfqActivityLogger::TYPE_QUOTE_SUBMITTED)
            ->first();

        $this->assertNotNull($act);
        $this->assertSame(1, $act->metadata['quote_version'] ?? null);
    }

    #[Test]
    public function resubmit_logs_supplier_quote_revised_with_incremented_version(): void
    {
        $ctx = $this->seedIssuedRfqWithInvitedSupplier();
        $rfq = $ctx['rfq'];
        $rfq->load('items');

        $this->actingAs($ctx['supplierUser'])
            ->post(route('supplier.rfqs.quotes.submit', $rfq->id), [
                'items' => $this->itemsPayload($rfq, 10.0),
            ]);

        $this->actingAs($ctx['supplierUser'])
            ->post(route('supplier.rfqs.quotes.submit', $rfq->id), [
                'items' => $this->itemsPayload($rfq, 20.0),
            ]);

        $rev = RfqActivity::query()
            ->where('rfq_id', $rfq->id)
            ->where('activity_type', SupplierRfqActivityLogger::TYPE_QUOTE_REVISED)
            ->orderByDesc('created_at')
            ->first();

        $this->assertNotNull($rev);
        $this->assertSame(2, $rev->metadata['quote_version'] ?? null);
        $this->assertSame('supplier_portal', $rev->metadata['source'] ?? null);
    }

    #[Test]
    public function attachment_upload_and_delete_are_logged(): void
    {
        $ctx = $this->seedIssuedRfqWithInvitedSupplier();
        $rfq = $ctx['rfq'];

        $file = UploadedFile::fake()->create('audit.pdf', 100);

        $this->actingAs($ctx['supplierUser'])
            ->post(route('supplier.rfqs.quote-attachments.store', $rfq->id), [
                'file' => $file,
            ])
            ->assertRedirect();

        $this->assertSame(
            1,
            RfqActivity::query()
                ->where('rfq_id', $rfq->id)
                ->where('activity_type', SupplierRfqActivityLogger::TYPE_ATTACHMENT_UPLOADED)
                ->count()
        );

        $uploadAct = RfqActivity::query()
            ->where('rfq_id', $rfq->id)
            ->where('activity_type', SupplierRfqActivityLogger::TYPE_ATTACHMENT_UPLOADED)
            ->first();
        $this->assertNotNull($uploadAct);
        $this->assertSame('supplier_portal', $uploadAct->metadata['source'] ?? null);

        $quote = RfqQuote::query()
            ->where('rfq_id', $rfq->id)
            ->where('supplier_id', $ctx['supplier']->id)
            ->first();
        $this->assertNotNull($quote);
        $media = $quote->getMedia('attachments')->first();
        $this->assertNotNull($media);

        $this->actingAs($ctx['supplierUser'])
            ->delete(route('supplier.rfqs.quote-attachments.destroy', [
                'rfq' => $rfq->id,
                'media' => $media->id,
            ]))
            ->assertRedirect();

        $this->assertSame(
            1,
            RfqActivity::query()
                ->where('rfq_id', $rfq->id)
                ->where('activity_type', SupplierRfqActivityLogger::TYPE_ATTACHMENT_DELETED)
                ->count()
        );

        $delAct = RfqActivity::query()
            ->where('rfq_id', $rfq->id)
            ->where('activity_type', SupplierRfqActivityLogger::TYPE_ATTACHMENT_DELETED)
            ->first();
        $this->assertNotNull($delAct);
        $this->assertSame('supplier_portal', $delAct->metadata['source'] ?? null);
    }
}
