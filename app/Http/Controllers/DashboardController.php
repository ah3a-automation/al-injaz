<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Contract;
use App\Models\ContractInvoice;
use App\Models\Rfq;
use App\Models\RfqActivity;
use App\Models\RfqSupplierQuote;
use App\Models\Supplier;
use App\Models\SupplierDocument;
use App\Models\Task;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class DashboardController extends Controller
{
    /**
     * Return dashboard metrics as JSON for the Procurement Intelligence Dashboard.
     */
    public function metrics(Request $request): JsonResponse
    {
        $userId = $request->user()?->id;
        if ($userId === null) {
            abort(401);
        }

        $activeStatuses = [
            Rfq::STATUS_DRAFT,
            Rfq::STATUS_APPROVED,
            Rfq::STATUS_ISSUED,
            Rfq::STATUS_SUPPLIER_QUESTIONS,
            Rfq::STATUS_RESPONSES_RECEIVED,
            Rfq::STATUS_UNDER_EVALUATION,
            Rfq::STATUS_RECOMMENDED,
        ];

        $rfqsInProgress = Rfq::whereIn('status', $activeStatuses)->count();
        $suppliersCount = Supplier::where('status', Supplier::STATUS_APPROVED)->count();
        $quotesReceived = $this->distinctSubmittedQuotesCount();
        $contractsAwarded = Contract::whereIn('status', [
            Contract::STATUS_ACTIVE,
            Contract::STATUS_COMPLETED,
            Contract::STATUS_PENDING_SIGNATURE,
        ])->count();

        $procurementInsights = $this->buildProcurementInsights();

        $tasksKpis = $this->buildTasksKpis((int) $userId);
        $contractsStatus = $this->buildContractsStatusKpis();
        $invoicePipeline = $this->buildInvoicePipelineKpis();
        $rfqResponseRate = $this->computeRfqResponseRate();

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
            ->map(fn ($i) => [
                'text' => $i['text'],
                'at' => $i['at'] ?? null,
            ])
            ->values()
            ->all();

        $approvedSupplierQuery = Supplier::where('status', Supplier::STATUS_APPROVED);
        $averageSupplierScore = (float) (clone $approvedSupplierQuery)->avg('ranking_score');
        $highRiskSuppliers = (clone $approvedSupplierQuery)
            ->where('ranking_score', '<', 50)
            ->get(['id', 'legal_name_en', 'ranking_score'])
            ->map(fn ($s) => [
                'id' => (string) $s->id,
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
            'rfqs_in_progress' => $rfqsInProgress,
            'suppliers_count' => $suppliersCount,
            'quotes_received' => $quotesReceived,
            'contracts_awarded' => $contractsAwarded,
            'pipeline' => $pipeline,
            'rfq_response_rate' => $rfqResponseRate,
            'tasks_kpis' => $tasksKpis,
            'contracts_status' => $contractsStatus,
            'invoice_pipeline' => $invoicePipeline,
            'supplier_ranking' => $supplierRanking,
            'recent_activity' => $recentActivity,
            'supplier_intelligence' => $supplierIntelligence,
            'procurement_insights' => $procurementInsights,
        ]);
    }

    /**
     * @return array{my_overdue_tasks: int, my_tasks_due_today: int, open_tasks_total: int}
     */
    private function buildTasksKpis(int $userId): array
    {
        $terminalStatuses = [Task::STATUS_DONE, Task::STATUS_CANCELLED];

        $myOverdue = Task::query()
            ->whereNotIn('status', $terminalStatuses)
            ->whereHas('assignees', fn ($a) => $a->where('users.id', $userId))
            ->whereNotNull('due_at')
            ->where('due_at', '<', now())
            ->count();

        $myDueToday = Task::query()
            ->whereNotIn('status', $terminalStatuses)
            ->whereHas('assignees', fn ($a) => $a->where('users.id', $userId))
            ->whereNotNull('due_at')
            ->whereDate('due_at', now()->toDateString())
            ->count();

        $openTotal = Task::query()
            ->whereNotIn('status', $terminalStatuses)
            ->count();

        return [
            'my_overdue_tasks' => $myOverdue,
            'my_tasks_due_today' => $myDueToday,
            'open_tasks_total' => $openTotal,
        ];
    }

    /**
     * @return array{
     *     contracts_pending_review: int,
     *     contracts_awaiting_signature: int,
     *     contracts_active: int
     * }
     */
    private function buildContractsStatusKpis(): array
    {
        $reviewStatuses = [
            Contract::STATUS_READY_FOR_REVIEW,
            Contract::STATUS_IN_LEGAL_REVIEW,
            Contract::STATUS_IN_COMMERCIAL_REVIEW,
            Contract::STATUS_IN_MANAGEMENT_REVIEW,
            Contract::STATUS_RETURNED_FOR_REWORK,
        ];

        $signatureStatuses = [
            Contract::STATUS_PENDING_SIGNATURE,
            Contract::STATUS_APPROVED_FOR_SIGNATURE,
            Contract::STATUS_SIGNATURE_PACKAGE_ISSUED,
            Contract::STATUS_AWAITING_INTERNAL_SIGNATURE,
            Contract::STATUS_AWAITING_SUPPLIER_SIGNATURE,
            Contract::STATUS_PARTIALLY_SIGNED,
        ];

        return [
            'contracts_pending_review' => Contract::query()->whereIn('status', $reviewStatuses)->count(),
            'contracts_awaiting_signature' => Contract::query()->whereIn('status', $signatureStatuses)->count(),
            'contracts_active' => Contract::query()->where('status', Contract::STATUS_ACTIVE)->count(),
        ];
    }

    /**
     * @return array{
     *     invoices_pending_approval: array{count: int, amounts: array<int, array{currency: string, amount: string}>},
     *     invoices_approved_unpaid: array{count: int, amounts: array<int, array{currency: string, amount: string}>},
     *     invoices_total_outstanding: array{count: int, amounts: array<int, array{currency: string, amount: string}>}
     * }
     */
    private function buildInvoicePipelineKpis(): array
    {
        $pending = ContractInvoice::STATUS_SUBMITTED;
        $approved = ContractInvoice::STATUS_APPROVED;

        $pendingCount = ContractInvoice::query()->where('status', $pending)->count();
        $approvedCount = ContractInvoice::query()->where('status', $approved)->count();
        $outstandingCount = ContractInvoice::query()
            ->whereIn('status', [$pending, $approved])
            ->count();

        return [
            'invoices_pending_approval' => [
                'count' => $pendingCount,
                'amounts' => $this->sumInvoiceAmountsGroupedByCurrencyForStatuses([$pending]),
            ],
            'invoices_approved_unpaid' => [
                'count' => $approvedCount,
                'amounts' => $this->sumInvoiceAmountsGroupedByCurrencyForStatuses([$approved]),
            ],
            'invoices_total_outstanding' => [
                'count' => $outstandingCount,
                'amounts' => $this->sumInvoiceAmountsGroupedByCurrencyForStatuses([$pending, $approved]),
            ],
        ];
    }

    /**
     * @param  array<int, string>  $statuses
     * @return array<int, array{currency: string, amount: string}>
     */
    private function sumInvoiceAmountsGroupedByCurrencyForStatuses(array $statuses): array
    {
        $rows = ContractInvoice::query()
            ->whereIn('status', $statuses)
            ->selectRaw('coalesce(currency, \'SAR\') as currency_key')
            ->selectRaw('coalesce(sum(amount), 0) as total')
            ->groupBy(DB::raw('coalesce(currency, \'SAR\')'))
            ->get();

        return $rows->map(static function ($r): array {
            return [
                'currency' => (string) $r->currency_key,
                'amount' => (string) $r->total,
            ];
        })->values()->all();
    }

    private function computeRfqResponseRate(): int
    {
        $issuedTotal = Rfq::query()->where('status', Rfq::STATUS_ISSUED)->count();
        if ($issuedTotal === 0) {
            return 0;
        }

        $responded = Rfq::query()
            ->where('status', Rfq::STATUS_ISSUED)
            ->whereHas('rfqSupplierQuotes', function ($q): void {
                $q->whereIn('status', [
                    RfqSupplierQuote::STATUS_SUBMITTED,
                    RfqSupplierQuote::STATUS_REVISED,
                ]);
            })
            ->count();

        return (int) round(($responded / $issuedTotal) * 100);
    }

    /**
     * Distinct (rfq_id, supplier_id) pairs with a submitted or revised quote.
     */
    private function distinctSubmittedQuotesCount(): int
    {
        $sub = RfqSupplierQuote::query()
            ->whereIn('status', [
                RfqSupplierQuote::STATUS_SUBMITTED,
                RfqSupplierQuote::STATUS_REVISED,
            ])
            ->select('rfq_id', 'supplier_id')
            ->distinct();

        return (int) DB::query()->fromSub($sub, 'q')->count();
    }

    /**
     * @return array{items: array<int, array{key: string, count: int}>, all_on_track: bool}
     */
    private function buildProcurementInsights(): array
    {
        $cutoff = now()->subDays(14);

        $rfqsStaleNoQuotes = Rfq::query()
            ->whereIn('status', [Rfq::STATUS_ISSUED, Rfq::STATUS_SUPPLIER_QUESTIONS])
            ->where(function ($q) use ($cutoff): void {
                $q->where(function ($q2) use ($cutoff): void {
                    $q2->whereNotNull('issued_at')->where('issued_at', '<=', $cutoff);
                })->orWhere(function ($q2) use ($cutoff): void {
                    $q2->whereNull('issued_at')->where('created_at', '<=', $cutoff);
                });
            })
            ->whereDoesntHave('rfqSupplierQuotes', function ($q): void {
                $q->whereIn('status', [
                    RfqSupplierQuote::STATUS_SUBMITTED,
                    RfqSupplierQuote::STATUS_REVISED,
                ]);
            })
            ->count();

        $supplierDocsExpiring = (int) DB::query()
            ->fromSub(
                SupplierDocument::query()
                    ->where('is_current', true)
                    ->whereNotNull('expiry_date')
                    ->whereDate('expiry_date', '>', now()->toDateString())
                    ->whereDate('expiry_date', '<=', now()->addDays(30)->toDateString())
                    ->select('supplier_id')
                    ->distinct(),
                'supplier_docs_expiring'
            )
            ->count();

        $contractsAwaitingApproval = Contract::query()
            ->whereIn('status', [
                Contract::STATUS_READY_FOR_REVIEW,
                Contract::STATUS_IN_LEGAL_REVIEW,
                Contract::STATUS_IN_COMMERCIAL_REVIEW,
                Contract::STATUS_IN_MANAGEMENT_REVIEW,
                Contract::STATUS_RETURNED_FOR_REWORK,
            ])
            ->count();

        $overdueTasks = Task::query()
            ->whereNotNull('due_at')
            ->where('due_at', '<', now())
            ->whereNotIn('status', [Task::STATUS_DONE, Task::STATUS_CANCELLED])
            ->count();

        $candidates = [
            ['key' => 'insight_rfqs_stale_no_quotes', 'count' => $rfqsStaleNoQuotes],
            ['key' => 'insight_supplier_docs_expiring', 'count' => $supplierDocsExpiring],
            ['key' => 'insight_contracts_awaiting_approval', 'count' => $contractsAwaitingApproval],
            ['key' => 'insight_overdue_tasks', 'count' => $overdueTasks],
        ];

        $nonZero = array_values(array_filter($candidates, static fn (array $row): bool => $row['count'] > 0));
        $items = array_slice($nonZero, 0, 3);
        $allOnTrack = $rfqsStaleNoQuotes === 0
            && $supplierDocsExpiring === 0
            && $contractsAwaitingApproval === 0
            && $overdueTasks === 0;

        return [
            'items' => $items,
            'all_on_track' => $allOnTrack,
        ];
    }
}
