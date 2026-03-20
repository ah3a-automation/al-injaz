<?php

declare(strict_types=1);

namespace Tests\Feature\Procurement;

use App\Application\Procurement\Services\CreateRfqFromPackageService;
use App\Application\Procurement\Services\SubmitRfqQuoteService;
use App\Models\BoqVersion;
use App\Models\Contract;
use App\Models\OutboxEvent;
use App\Models\ProcurementPackage;
use App\Models\Project;
use App\Models\ProjectBoqItem;
use App\Models\Rfq;
use App\Models\RfqDocument;
use App\Models\RfqSupplierInvitation;
use App\Models\Supplier;
use App\Models\SystemNotification;
use App\Models\User;
use App\Services\Procurement\ContractInvoiceService;
use App\Services\Procurement\ContractLifecycleService;
use App\Services\Procurement\ContractService;
use App\Services\Contracts\ContractAdministrationBaselineService;
use App\Services\Contracts\ContractVariationService;
use App\Services\Procurement\PackageReadinessService;
use App\Services\Procurement\RfqAwardService;
use App\Services\Procurement\RfqClarificationService;
use App\Services\Procurement\RfqComparisonService;
use App\Services\Procurement\RfqEvaluationService;
use App\Services\Procurement\RfqEventService;
use App\Services\Procurement\RfqQuoteService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

final class ProcurementLifecycleIntegrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_full_procurement_lifecycle_flow_is_consistent(): void
    {
        $buyer = User::factory()->create();
        $supplierUser = User::factory()->create();

        $supplier = Supplier::create([
            'id' => (string) Str::uuid(),
            'supplier_code' => 'SUP-' . strtoupper(Str::random(8)),
            'legal_name_en' => 'Lifecycle Supplier',
            'country' => 'SA',
            'city' => 'Riyadh',
            'status' => Supplier::STATUS_APPROVED,
            'is_verified' => true,
            'supplier_user_id' => $supplierUser->id,
        ]);

        $project = Project::create([
            'name' => 'Lifecycle Project',
            'status' => 'active',
            'owner_user_id' => $buyer->id,
            'code' => 'LIFE' . random_int(100, 999),
            'currency' => 'SAR',
        ]);

        $boqVersion = BoqVersion::create([
            'project_id' => $project->id,
            'version_no' => 1,
            'status' => 'active',
            'imported_by' => $buyer->id,
        ]);

        $boqItems = collect([
            ['code' => 'ITM-1', 'description_en' => 'Item one', 'qty' => 2, 'planned_cost' => 1000, 'revenue_amount' => 1300, 'unit' => 'pcs', 'lead_type' => 'short'],
            ['code' => 'ITM-2', 'description_en' => 'Item two', 'qty' => 1, 'planned_cost' => 500, 'revenue_amount' => 700, 'unit' => 'pcs', 'lead_type' => 'short'],
        ])->map(fn (array $row) => ProjectBoqItem::create(array_merge($row, [
            'project_id' => $project->id,
            'boq_version_id' => $boqVersion->id,
        ])));

        $package = ProcurementPackage::create([
            'project_id' => $project->id,
            'package_no' => $project->code . '-PKG-001',
            'name' => 'Lifecycle Package',
            'currency' => 'SAR',
            'estimated_cost' => 1500,
            'estimated_revenue' => 2000,
            'status' => ProcurementPackage::STATUS_DRAFT,
            'created_by' => $buyer->id,
        ]);
        $package->boqItems()->attach($boqItems->pluck('id')->all());
        $package->attachments()->create([
            'source_type' => 'upload',
            'title' => 'Spec',
            'file_path' => '/tmp/spec.pdf',
            'uploaded_by' => $buyer->id,
        ]);

        $packageReadiness = app(PackageReadinessService::class)->check($package);

        $this->assertTrue($package->fresh()->isDraft());
        $this->assertArrayHasKey('score', $packageReadiness);
        $this->assertDatabaseCount('package_activities', 1);

        $rfq = app(CreateRfqFromPackageService::class)->execute($package, [
            'title' => 'Lifecycle RFQ',
            'submission_deadline' => now()->addDays(10)->toDateString(),
            'currency' => 'SAR',
            'supplier_ids' => [$supplier->id],
            'created_by' => $buyer->id,
        ]);

        $this->assertNotNull($rfq->id);
        $this->assertSame(Rfq::STATUS_DRAFT, $rfq->fresh()->status);
        $this->assertDatabaseHas('rfq_supplier_invitations', [
            'rfq_id' => $rfq->id,
            'supplier_id' => $supplier->id,
            'status' => RfqSupplierInvitation::STATUS_INVITED,
        ]);

        RfqDocument::create([
            'rfq_id' => $rfq->id,
            'document_type' => 'specifications',
            'source_type' => 'upload',
            'title' => 'RFQ Spec',
            'file_path' => '/tmp/rfq-spec.pdf',
            'uploaded_by' => $buyer->id,
        ]);

        $rfq->changeStatus(Rfq::STATUS_ISSUED, $buyer);
        app(RfqEventService::class)->rfqIssued($rfq->fresh());
        app(RfqClarificationService::class)->createQuestion($rfq->fresh(), 'Need detail?', $supplier, $supplierUser);

        $rfq->refresh()->load('items');
        $itemsPayload = [];
        foreach ($rfq->items as $item) {
            $unitPrice = 100.0;
            $itemsPayload[$item->id] = [
                'unit_price' => $unitPrice,
                'total_price' => $unitPrice * (float) ($item->qty ?? 1),
                'notes' => null,
            ];
        }

        $quote = app(SubmitRfqQuoteService::class)->execute($rfq, [
            'supplier_id' => $supplier->id,
            'items' => $itemsPayload,
        ]);
        $quote->load('items');
        $totalAmount = (float) $quote->items->sum('total_price');
        app(RfqQuoteService::class)->recordSubmission($rfq->fresh(), $supplier, $totalAmount, $supplierUser);

        $invitation = RfqSupplierInvitation::query()
            ->where('rfq_id', $rfq->id)
            ->where('supplier_id', $supplier->id)
            ->firstOrFail();
        $this->assertNotNull($invitation->invited_at);
        $this->assertNotNull($invitation->responded_at);

        DB::connection()->flushQueryLog();
        DB::connection()->enableQueryLog();
        $comparison = app(RfqComparisonService::class)->buildComparison($rfq->fresh());
        $comparisonQueryCount = count(DB::connection()->getQueryLog());
        DB::connection()->disableQueryLog();
        $this->assertNotEmpty($comparison['suppliers']);
        $this->assertArrayHasKey('quote_rank', $comparison['suppliers'][0]);
        $this->assertArrayHasKey('deviation_from_estimate', $comparison['suppliers'][0]);
        $this->assertArrayHasKey('completeness_percent', $comparison['suppliers'][0]);
        $this->assertLessThanOrEqual(8, $comparisonQueryCount, 'Comparison endpoint query count is too high (potential N+1).');

        $rfq->fresh()->changeStatus(Rfq::STATUS_UNDER_EVALUATION, $buyer);
        app(RfqEvaluationService::class)->recordEvaluation($rfq->fresh(), $supplier, $buyer, 30, 35, 30, 'ok');
        $recommendation = app(RfqEvaluationService::class)->recommendSupplier($rfq->fresh(), $buyer);
        $this->assertNotNull($recommendation);
        $this->assertSame($supplier->id, $recommendation['supplier_id']);

        $award = app(RfqAwardService::class)->awardSupplier($rfq->fresh(), $supplier, $buyer, 300, 'SAR', 'best');
        $this->assertNotNull($award->id);
        $this->assertSame(Rfq::STATUS_AWARDED, $rfq->fresh()->status);

        $contract = app(ContractService::class)->createFromAward($rfq->fresh(), $award, $buyer);
        $this->assertNotNull($contract->id);
        $this->assertSame(Rfq::STATUS_CLOSED, $rfq->fresh()->status);
        $this->assertSame(Contract::STATUS_DRAFT, $contract->fresh()->status);

        app(ContractLifecycleService::class)->sendForSignature($contract->fresh(), $buyer);
        app(ContractLifecycleService::class)->activateContract($contract->fresh(), $buyer);
        app(ContractLifecycleService::class)->completeContract($contract->fresh(), $buyer);
        $this->assertSame(Contract::STATUS_COMPLETED, $contract->fresh()->status);

        $contractActive = Contract::query()->findOrFail($contract->id);
        $contractActive->status = Contract::STATUS_EXECUTED;
        $contractActive->contract_number = $contractActive->contract_number ?? 'CONTRACT-1';
        $contractActive->save();

        app(ContractAdministrationBaselineService::class)->initializeAdministrationBaseline(
            $contractActive->fresh(),
            [
                'contract_value_final' => 300,
                'currency_final' => 'SAR',
            ],
            $buyer
        );

        $variation = app(ContractVariationService::class)->createVariation(
            $contractActive->fresh(),
            [
                'title' => 'VO1',
                'variation_type' => 'commercial',
                'commercial_delta' => 50,
                'currency' => 'SAR',
                'time_delta_days' => 0,
            ],
            $buyer
        );
        app(ContractVariationService::class)->submitVariation($variation->fresh(), $buyer);
        app(ContractVariationService::class)->approveVariation($variation->fresh(), $buyer, null);
        $this->assertSame('approved', $variation->fresh()->status);
        $this->assertEqualsWithDelta(350.0, $contractActive->fresh()->getCurrentContractValue(), 0.001);

        $invoice = app(ContractInvoiceService::class)->createInvoice(
            $contractActive->fresh(),
            $buyer,
            'INV-1',
            now()->toDateString(),
            120.0,
            20.0,
            'SAR'
        );
        app(ContractInvoiceService::class)->submitInvoice($invoice->fresh(), $buyer);
        app(ContractInvoiceService::class)->approveInvoice($invoice->fresh(), $buyer);
        app(ContractInvoiceService::class)->markPaid($invoice->fresh(), $buyer);
        $this->assertSame('paid', $invoice->fresh()->status);
        $this->assertEqualsWithDelta(100.0, $contractActive->fresh()->getApprovedInvoiceTotal(), 0.001);
        $this->assertEqualsWithDelta(100.0, $contractActive->fresh()->getPaidInvoiceTotal(), 0.001);
        $this->assertEqualsWithDelta(250.0, $contractActive->fresh()->getOutstandingBalance(), 0.001);

        $this->assertGreaterThan(0, DB::table('package_activities')->where('package_id', $package->id)->count());
        $this->assertGreaterThan(0, DB::table('rfq_activities')->where('rfq_id', $rfq->id)->count());
        $this->assertGreaterThan(0, DB::table('contract_activities')->where('contract_id', $contract->id)->count());

        foreach (['rfq.issued', 'clarification.added', 'quote.submitted', 'rfq.awarded', 'contract.activated'] as $eventKey) {
            $this->assertGreaterThan(0, SystemNotification::query()->where('event_key', $eventKey)->count(), $eventKey . ' notification missing');
        }

        $this->assertGreaterThan(0, OutboxEvent::query()->where('event_key', 'rfq.quote_submitted')->count(), 'Outbox: rfq.quote_submitted missing');
        $this->assertGreaterThan(0, OutboxEvent::query()->where('event_key', 'rfq.awarded')->count(), 'Outbox: rfq.awarded missing');
        $this->assertGreaterThan(0, OutboxEvent::query()->where('event_key', 'contract.created')->count(), 'Outbox: contract.created missing');
        $this->assertGreaterThan(0, OutboxEvent::query()->where('event_key', 'contract.activated')->count(), 'Outbox: contract.activated missing');
        $this->assertGreaterThan(0, OutboxEvent::query()->where('event_key', 'contract.variation_approved')->count(), 'Outbox: contract.variation_approved missing');
        $this->assertGreaterThan(0, OutboxEvent::query()->where('event_key', 'contract.invoice_paid')->count(), 'Outbox: contract.invoice_paid missing');
    }
}
