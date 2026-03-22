<?php

declare(strict_types=1);

namespace App\Services\Contracts;

use App\Models\Contract;
use App\Models\ContractInvoice;
use App\Models\ContractRetentionRelease;
use App\Models\User;
use RuntimeException;

final class ContractRetentionReleaseService
{
    /**
     * @return array{is_ready: bool, issues: array<int, string>}
     */
    public function checkRetentionEligibility(Contract $contract): array
    {
        $issues = [];

        if ($contract->status !== Contract::STATUS_EXECUTED) {
            $issues[] = __('contracts.execution.eligibility.executed_for_retention');
        }
        if ($contract->administration_status !== Contract::ADMIN_STATUS_INITIALIZED) {
            $issues[] = __('contracts.execution.eligibility.administration_for_retention');
        }

        return [
            'is_ready' => $issues === [],
            'issues' => $issues,
        ];
    }

    /**
     * @param array{amount: float|string, currency: string, reason?: string|null} $payload
     */
    public function createReleaseRequest(Contract $contract, array $payload, User $actor): ContractRetentionRelease
    {
        $eligibility = $this->checkRetentionEligibility($contract);
        if (! $eligibility['is_ready']) {
            throw new RuntimeException(implode(' ', $eligibility['issues']));
        }

        $amount = is_numeric($payload['amount']) ? (float) $payload['amount'] : 0.0;
        if ($amount <= 0) {
            throw new RuntimeException(__('contracts.execution.errors.retention_release_amount_positive'));
        }

        $release = new ContractRetentionRelease();
        $release->contract_id = $contract->id;
        $release->release_no = $this->nextReleaseNumber($contract);
        $release->status = ContractRetentionRelease::STATUS_PENDING;
        $release->amount = $amount;
        $release->currency = $payload['currency'];
        $release->reason = $payload['reason'] ?? null;
        $release->created_by_user_id = $actor->id;
        $release->updated_by_user_id = $actor->id;
        $release->save();

        $this->refreshRetentionSummary($contract);

        return $release;
    }

    public function submitRelease(ContractRetentionRelease $release, User $actor): ContractRetentionRelease
    {
        if ($release->status !== ContractRetentionRelease::STATUS_PENDING) {
            throw new RuntimeException(__('contracts.execution.errors.retention_release_only_pending_submittable'));
        }

        $release->status = ContractRetentionRelease::STATUS_SUBMITTED;
        $release->submitted_at = now();
        $release->submitted_by_user_id = $actor->id;
        $release->updated_by_user_id = $actor->id;
        $release->save();

        $this->refreshRetentionSummary($release->contract);

        return $release;
    }

    public function approveRelease(ContractRetentionRelease $release, User $actor, ?string $notes = null): ContractRetentionRelease
    {
        if ($release->status !== ContractRetentionRelease::STATUS_SUBMITTED) {
            throw new RuntimeException(__('contracts.execution.errors.retention_release_only_submitted_approvable'));
        }

        $this->assertRetentionReleaseWithinHeldPool($release);

        $release->status = ContractRetentionRelease::STATUS_APPROVED;
        $release->approved_at = now();
        $release->approved_by_user_id = $actor->id;
        $release->rejected_at = null;
        $release->rejected_by_user_id = null;
        $release->decision_notes = $notes;
        $release->updated_by_user_id = $actor->id;
        $release->save();

        $this->refreshRetentionSummary($release->contract);

        return $release;
    }

    public function rejectRelease(ContractRetentionRelease $release, User $actor, ?string $notes = null): ContractRetentionRelease
    {
        if ($release->status !== ContractRetentionRelease::STATUS_SUBMITTED) {
            throw new RuntimeException(__('contracts.execution.errors.retention_release_only_submitted_rejectable'));
        }

        $release->status = ContractRetentionRelease::STATUS_REJECTED;
        $release->rejected_at = now();
        $release->rejected_by_user_id = $actor->id;
        $release->approved_at = null;
        $release->approved_by_user_id = null;
        $release->decision_notes = $notes;
        $release->updated_by_user_id = $actor->id;
        $release->save();

        $this->refreshRetentionSummary($release->contract);

        return $release;
    }

    public function markReleased(ContractRetentionRelease $release, User $actor, ?string $notes = null): ContractRetentionRelease
    {
        if ($release->status !== ContractRetentionRelease::STATUS_APPROVED) {
            throw new RuntimeException(__('contracts.execution.errors.retention_release_only_approved_releasable'));
        }

        $release->status = ContractRetentionRelease::STATUS_RELEASED;
        $release->released_at = now();
        $release->released_by_user_id = $actor->id;
        if ($notes !== null) {
            $release->decision_notes = $release->decision_notes
                ? $release->decision_notes . "\n" . $notes
                : $notes;
        }
        $release->updated_by_user_id = $actor->id;
        $release->save();

        $this->refreshRetentionSummary($release->contract);

        return $release;
    }

    public function refreshRetentionSummary(Contract $contract): Contract
    {
        $contract->refresh();
        $releases = $contract->retentionReleases()->get();

        $releasedTotal = $releases->where('status', ContractRetentionRelease::STATUS_RELEASED)->sum(fn (ContractRetentionRelease $r) => (float) $r->amount);
        $pendingTotal = $releases->whereIn('status', [
            ContractRetentionRelease::STATUS_PENDING,
            ContractRetentionRelease::STATUS_SUBMITTED,
            ContractRetentionRelease::STATUS_APPROVED,
        ])->sum(fn (ContractRetentionRelease $r) => (float) $r->amount);
        $heldTotal = $releasedTotal + $pendingTotal;

        $contract->retention_total_released = $releasedTotal;
        $contract->retention_total_pending = $pendingTotal;
        $contract->retention_total_held = $heldTotal;
        $contract->save();

        return $contract;
    }

    /**
     * Cap approved+released retention against the sum of retention held on approved/paid invoices.
     * When that sum is zero there is no authoritative baseline from invoicing — enforcement is skipped
     * (see translation key contracts.retention_amount_not_set).
     */
    private function assertRetentionReleaseWithinHeldPool(ContractRetentionRelease $release): void
    {
        $contract = $release->contract()->first();
        if ($contract === null) {
            return;
        }

        $pool = (float) $contract->invoices()
            ->whereIn('status', [ContractInvoice::STATUS_APPROVED, ContractInvoice::STATUS_PAID])
            ->get()
            ->sum(fn (ContractInvoice $i): float => (float) ($i->retention_amount ?? 0));

        if ($pool <= 0) {
            return;
        }

        $committed = (float) $contract->retentionReleases()
            ->where('id', '!=', $release->id)
            ->whereIn('status', [
                ContractRetentionRelease::STATUS_APPROVED,
                ContractRetentionRelease::STATUS_RELEASED,
            ])
            ->sum('amount');

        if ($committed + (float) $release->amount > $pool + 0.01) {
            throw new RuntimeException(__('contracts.retention_release_would_exceed_held'));
        }
    }

    public function nextReleaseNumber(Contract $contract): string
    {
        $maxNo = $contract->retentionReleases()
            ->whereRaw("release_no ~ '^REL-[0-9]+$'")
            ->selectRaw("COALESCE(MAX(CAST(SUBSTRING(release_no FROM 5) AS INTEGER)), 0) AS n")
            ->value('n');

        $next = (int) ($maxNo ?? 0) + 1;

        return 'REL-' . str_pad((string) $next, 3, '0', STR_PAD_LEFT);
    }
}
