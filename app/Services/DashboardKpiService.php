<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\ProcurementPackage;
use App\Models\Project;
use App\Models\Rfq;
use App\Models\RfqClarification;
use App\Models\Supplier;

final class DashboardKpiService
{
    /**
     * @return array<string, int>
     */
    public function getKpis(): array
    {
        $rfqStrip = $this->rfqIssuedAndOverdueDeadlines();

        return [
            'active_projects'                 => $this->activeProjects(),
            'packages_in_progress'            => $this->packagesInProgress(),
            'rfqs_issued'                     => $rfqStrip['rfqs_issued'],
            'pending_clarifications'          => $this->pendingClarifications(),
            'supplier_registrations_pending'  => $this->supplierRegistrationsPending(),
            'overdue_deadlines'               => $rfqStrip['overdue_deadlines'],
        ];
    }

    private function activeProjects(): int
    {
        // Projects explicitly use 'active' as the active status via scopeActive().
        return Project::where('status', 'active')->count();
    }

    private function packagesInProgress(): int
    {
        // Packages that are not yet awarded/closed/cancelled.
        return ProcurementPackage::whereIn('status', [
            ProcurementPackage::STATUS_DRAFT,
            ProcurementPackage::STATUS_UNDER_REVIEW,
            ProcurementPackage::STATUS_APPROVED_FOR_RFQ,
            ProcurementPackage::STATUS_RFQ_IN_PROGRESS,
            ProcurementPackage::STATUS_EVALUATION,
        ])->count();
    }

    /**
     * Single aggregate on rfqs: issued count + overdue-deadline count (same filters as before).
     *
     * @return array{rfqs_issued: int, overdue_deadlines: int}
     */
    private function rfqIssuedAndOverdueDeadlines(): array
    {
        $deadlineCutoff = now()->toDateString();

        $row = Rfq::query()
            ->selectRaw('COUNT(*) FILTER (WHERE status = ?)::int as issued', [Rfq::STATUS_ISSUED])
            ->selectRaw(
                'COUNT(*) FILTER (WHERE submission_deadline IS NOT NULL AND submission_deadline < ? AND status NOT IN (?,?,?))::int as overdue',
                [
                    $deadlineCutoff,
                    Rfq::STATUS_AWARDED,
                    Rfq::STATUS_CLOSED,
                    Rfq::STATUS_CANCELLED,
                ]
            )
            ->first();

        return [
            'rfqs_issued' => (int) ($row->issued ?? 0),
            'overdue_deadlines' => (int) ($row->overdue ?? 0),
        ];
    }

    private function pendingClarifications(): int
    {
        return RfqClarification::whereIn('status', [
            RfqClarification::STATUS_OPEN,
            RfqClarification::STATUS_REOPENED,
        ])->count();
    }

    private function supplierRegistrationsPending(): int
    {
        return Supplier::whereIn('status', [
            Supplier::STATUS_PENDING_REGISTRATION,
            Supplier::STATUS_PENDING_REVIEW,
            Supplier::STATUS_UNDER_REVIEW,
            Supplier::STATUS_MORE_INFO_REQUESTED,
        ])->count();
    }
}
