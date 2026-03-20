<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Supplier;
use App\Services\SupplierIntelligence\SupplierIntelligenceSnapshotService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class SupplierIntelligenceApiController extends Controller
{
    public function __construct(
        private readonly SupplierIntelligenceSnapshotService $snapshotService,
    ) {}

    /**
     * GET /api/suppliers/{supplier}/intelligence
     * Returns JSON snapshot: supplier_id, risk_score, risk_level, compliance_status, compliance_score,
     * capacity_utilization, ranking_score, response_rate, award_rate.
     */
    public function show(Request $request, Supplier $supplier): JsonResponse
    {
        $this->authorize('view', $supplier);
        $snapshot = $this->snapshotService->getSnapshot($supplier);
        return response()->json([
            'supplier_id' => $supplier->id,
            'risk_score' => $snapshot['risk_score'],
            'risk_level' => $snapshot['risk_level'],
            'compliance_status' => $snapshot['compliance_status'],
            'compliance_score' => $snapshot['compliance_score'],
            'capacity_utilization' => $snapshot['capacity_utilization'],
            'ranking_score' => $snapshot['ranking_score'],
            'response_rate' => $snapshot['response_rate'],
            'award_rate' => $snapshot['award_rate'],
        ]);
    }
}
