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
        return [
            'active_projects'                 => $this->activeProjects(),
            'packages_in_progress'            => $this->packagesInProgress(),
            'rfqs_issued'                     => $this->rfqsIssued(),
            'pending_clarifications'          => $this->pendingClarifications(),
            'supplier_registrations_pending'  => $this->supplierRegistrationsPending(),
            'overdue_deadlines'               => $this->overdueDeadlines(),
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

    private function rfqsIssued(): int
    {
        return Rfq::where('status', Rfq::STATUS_ISSUED)->count();
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

    private function overdueDeadlines(): int
    {
        return Rfq::whereNotNull('submission_deadline')
            ->where('submission_deadline', '<', now()->toDateString())
            ->whereNotIn('status', [
                Rfq::STATUS_AWARDED,
                Rfq::STATUS_CLOSED,
                Rfq::STATUS_CANCELLED,
            ])
            ->count();
    }
}

