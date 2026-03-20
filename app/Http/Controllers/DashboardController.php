<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Contract;
use App\Models\Rfq;
use App\Models\RfqActivity;
use App\Models\RfqSupplierQuote;
use App\Models\Supplier;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

final class DashboardController extends Controller
{
    /**
     * Return dashboard metrics as JSON for the Procurement Intelligence Dashboard.
     */
    public function metrics(): JsonResponse
    {
        $activeStatuses = [
            Rfq::STATUS_DRAFT,
            Rfq::STATUS_APPROVED,
            Rfq::STATUS_ISSUED,
            Rfq::STATUS_SUPPLIER_QUESTIONS,
            Rfq::STATUS_RESPONSES_RECEIVED,
            Rfq::STATUS_UNDER_EVALUATION,
            Rfq::STATUS_RECOMMENDED,
        ];

        $rfqsActive = Rfq::whereIn('status', $activeStatuses)->count();
        $suppliersCount = Supplier::where('status', Supplier::STATUS_APPROVED)->count();
        $quotesReceived = RfqSupplierQuote::where('status', RfqSupplierQuote::STATUS_SUBMITTED)->count();
        $contractsAwarded = Contract::whereIn('status', [
            Contract::STATUS_ACTIVE,
            Contract::STATUS_COMPLETED,
            Contract::STATUS_PENDING_SIGNATURE,
        ])->count();

        $pipeline = [
            'draft' => Rfq::whereIn('status', [Rfq::STATUS_DRAFT, Rfq::STATUS_APPROVED])->count(),
            'sent' => Rfq::whereIn('status', [
                Rfq::STATUS_ISSUED,
                Rfq::STATUS_SUPPLIER_QUESTIONS,
            ])->count(),
            'quotes_received' => Rfq::where('status', Rfq::STATUS_RESPONSES_RECEIVED)->count(),
            'evaluation' => Rfq::whereIn('status', [
                Rfq::STATUS_UNDER_EVALUATION,
                Rfq::STATUS_RECOMMENDED,
            ])->count(),
            'awarded' => Rfq::where('status', Rfq::STATUS_AWARDED)->count(),
        ];

        $supplierRanking = Supplier::query()
            ->where('status', Supplier::STATUS_APPROVED)
            ->leftJoinSub(
                Contract::query()
                    ->select('supplier_id')
                    ->selectRaw('count(*) as contracts_count')
                    ->groupBy('supplier_id'),
                'contract_counts',
                'contract_counts.supplier_id',
                '=',
                'suppliers.id'
            )
            ->select([
                'suppliers.id',
                'suppliers.legal_name_en',
                'suppliers.ranking_score',
                DB::raw('coalesce(contract_counts.contracts_count, 0) as contracts_count'),
            ])
            ->orderByDesc('ranking_score')
            ->limit(10)
            ->get()
            ->map(function ($row) {
                return [
                    'supplier' => $row->legal_name_en ?? '—',
                    'score' => $row->ranking_score !== null ? (int) round((float) $row->ranking_score) : 0,
                    'projects' => (int) ($row->contracts_count ?? 0),
                    'avg_quote_rank' => 0,
                ];
            });

        $recentRfq = RfqActivity::query()
            ->with('rfq:id,rfq_number')
            ->orderByDesc('created_at')
            ->limit(20)
            ->get()
            ->map(function (RfqActivity $a) {
                $rfqNum = $a->rfq?->rfq_number ?? 'RFQ';
                return [
                    'text' => $a->description ?? "{$rfqNum} activity",
                    'at' => $a->created_at?->toIso8601String(),
                ];
            });

        $recentContract = \App\Models\ContractActivity::query()
            ->with('contract:id,contract_number')
            ->orderByDesc('created_at')
            ->limit(10)
            ->get()
            ->map(function (\App\Models\ContractActivity $a) {
                $num = $a->contract?->contract_number ?? 'Contract';
                return [
                    'text' => $a->description ?? "{$num} activity",
                    'at' => $a->created_at?->toIso8601String(),
                ];
            });

        $recentActivity = $recentRfq->concat($recentContract)
            ->sortByDesc(fn ($i) => $i['at'] ?? '')
            ->values()
            ->take(10)
            ->map(fn ($i) => $i['text'])
            ->values()
            ->all();

        $approvedSupplierQuery = Supplier::where('status', Supplier::STATUS_APPROVED);
        $averageSupplierScore = (float) (clone $approvedSupplierQuery)->avg('ranking_score');
        $highRiskSuppliers = (clone $approvedSupplierQuery)
            ->where('ranking_score', '<', 50)
            ->get(['id', 'legal_name_en', 'ranking_score'])
            ->map(fn ($s) => [
                'supplier' => $s->legal_name_en ?? '—',
                'score' => $s->ranking_score !== null ? (int) round((float) $s->ranking_score) : 0,
            ])
            ->values()
            ->all();
        $suppliersByRegion = (clone $approvedSupplierQuery)
            ->select('country')
            ->selectRaw('count(*) as count')
            ->groupBy('country')
            ->orderByDesc('count')
            ->get()
            ->map(fn ($r) => ['region' => $r->country ?? 'Unknown', 'count' => (int) $r->count])
            ->values()
            ->all();

        $topSuppliersByScore = Supplier::query()
            ->where('status', Supplier::STATUS_APPROVED)
            ->leftJoinSub(
                Contract::query()
                    ->select('supplier_id')
                    ->selectRaw('count(*) as contracts_count')
                    ->groupBy('supplier_id'),
                'contract_counts',
                'contract_counts.supplier_id',
                '=',
                'suppliers.id'
            )
            ->select([
                'suppliers.id',
                'suppliers.legal_name_en',
                'suppliers.ranking_score',
                DB::raw('coalesce(contract_counts.contracts_count, 0) as contracts_count'),
            ])
            ->orderByDesc('ranking_score')
            ->limit(5)
            ->get()
            ->map(function ($row) {
                return [
                    'supplier' => $row->legal_name_en ?? '—',
                    'score' => $row->ranking_score !== null ? (int) round((float) $row->ranking_score) : 0,
                    'projects' => (int) ($row->contracts_count ?? 0),
                ];
            });

        $supplierIntelligence = [
            'top_suppliers_by_score' => $topSuppliersByScore,
            'average_supplier_score' => round($averageSupplierScore, 1),
            'high_risk_suppliers' => $highRiskSuppliers,
            'suppliers_by_region' => $suppliersByRegion,
        ];

        return response()->json([
            'rfqs_active' => $rfqsActive,
            'suppliers_count' => $suppliersCount,
            'quotes_received' => $quotesReceived,
            'contracts_awarded' => $contractsAwarded,
            'pipeline' => $pipeline,
            'supplier_ranking' => $supplierRanking,
            'recent_activity' => $recentActivity,
            'supplier_intelligence' => $supplierIntelligence,
        ]);
    }
}
