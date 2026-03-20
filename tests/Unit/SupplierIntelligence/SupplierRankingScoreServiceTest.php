<?php

declare(strict_types=1);

namespace Tests\Unit\SupplierIntelligence;

use App\Models\RfqAward;
use App\Models\RfqQuote;
use App\Models\RfqSupplier;
use App\Models\Supplier;
use App\Services\SupplierIntelligence\SupplierRankingScoreService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

final class SupplierRankingScoreServiceTest extends TestCase
{
    use RefreshDatabase;

    private SupplierRankingScoreService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = app(SupplierRankingScoreService::class);
    }

    public function test_supplier_with_strong_metrics_gets_higher_score(): void
    {
        $user = \App\Models\User::factory()->create();
        $supplier = Supplier::create([
            'id'            => (string) Str::uuid(),
            'supplier_code' => 'SUP-STRONG',
            'legal_name_en' => 'Strong Supplier',
            'country'       => 'SA',
            'city'          => 'Riyadh',
            'status'        => Supplier::STATUS_APPROVED,
            'is_verified'   => true,
            'risk_score'    => 10,
        ]);

        $rfq = \App\Models\Rfq::create([
            'id'                  => (string) Str::uuid(),
            'rfq_number'          => 'RFQ-TEST-' . Str::random(6),
            'title'               => 'Test RFQ',
            'status'              => 'issued',
            'created_by'          => $user->id,
            'procurement_package_id' => null,
            'project_id'          => null,
        ]);

        RfqSupplier::create([
            'id'          => (string) Str::uuid(),
            'rfq_id'      => $rfq->id,
            'supplier_id' => $supplier->id,
            'status'      => 'submitted',
        ]);
        RfqQuote::create([
            'rfq_id'      => $rfq->id,
            'supplier_id' => $supplier->id,
            'status'      => 'submitted',
        ]);
        RfqAward::create([
            'id'             => (string) Str::uuid(),
            'rfq_id'         => $rfq->id,
            'supplier_id'    => $supplier->id,
            'awarded_amount' => 100,
            'currency'       => 'SAR',
            'awarded_by'     => $user->id,
        ]);

        $result = $this->service->score($supplier);

        $this->assertGreaterThanOrEqual(60, $result['score']);
        $this->assertContains($result['tier'], ['preferred', 'approved', 'watchlist']);
        $this->assertNotEmpty($result['factors']);
    }

    public function test_suspended_supplier_gets_penalized(): void
    {
        $supplier = Supplier::create([
            'id'            => (string) Str::uuid(),
            'supplier_code' => 'SUP-SUSP',
            'legal_name_en' => 'Suspended Supplier',
            'country'       => 'SA',
            'city'          => 'Riyadh',
            'status'        => Supplier::STATUS_SUSPENDED,
            'risk_score'    => 20,
        ]);

        $result = $this->service->score($supplier);

        $this->assertLessThan(70, $result['score']);
        $penaltyFactor = collect($result['factors'])->firstWhere('key', 'suspension_penalty');
        $this->assertNotNull($penaltyFactor);
        $this->assertLessThan(0, $penaltyFactor['impact']);
    }

    public function test_blacklisted_supplier_gets_heavy_penalty(): void
    {
        $supplier = Supplier::create([
            'id'            => (string) Str::uuid(),
            'supplier_code' => 'SUP-BLACK',
            'legal_name_en' => 'Blacklisted Supplier',
            'country'       => 'SA',
            'city'          => 'Riyadh',
            'status'        => Supplier::STATUS_BLACKLISTED,
            'risk_score'    => 50,
        ]);

        $result = $this->service->score($supplier);

        $this->assertLessThanOrEqual(50, $result['score']);
        $this->assertSame('restricted', $result['tier']);
        $penaltyFactor = collect($result['factors'])->firstWhere('key', 'blacklist_penalty');
        $this->assertNotNull($penaltyFactor);
    }

    public function test_missing_data_does_not_crash_scoring(): void
    {
        $supplier = Supplier::create([
            'id'            => (string) Str::uuid(),
            'supplier_code' => 'SUP-NEW',
            'legal_name_en' => 'New Supplier',
            'country'       => 'SA',
            'city'          => 'Riyadh',
            'status'        => Supplier::STATUS_APPROVED,
            'risk_score'    => null,
        ]);

        $result = $this->service->score($supplier);

        $this->assertIsFloat($result['score']);
        $this->assertGreaterThanOrEqual(0, $result['score']);
        $this->assertLessThanOrEqual(100, $result['score']);
        $this->assertNotEmpty($result['tier']);
        $this->assertNotEmpty($result['factors']);
    }

    public function test_recalculate_persists_to_supplier(): void
    {
        $supplier = Supplier::create([
            'id'            => (string) Str::uuid(),
            'supplier_code' => 'SUP-RECALC',
            'legal_name_en' => 'Recalc Supplier',
            'country'       => 'SA',
            'city'          => 'Riyadh',
            'status'        => Supplier::STATUS_APPROVED,
        ]);

        $result = $this->service->recalculate($supplier);

        $supplier->refresh();
        $this->assertNotNull($supplier->ranking_score);
        $this->assertNotNull($supplier->ranking_tier);
        $this->assertNotNull($supplier->ranking_scored_at);
        $this->assertSame($result['score'], (float) $supplier->ranking_score);
        $this->assertSame($result['tier'], $supplier->ranking_tier);
    }
}
