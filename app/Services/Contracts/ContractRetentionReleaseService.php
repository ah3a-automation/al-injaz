<?php

declare(strict_types=1);

namespace App\Services\Contracts;

use App\Models\Contract;
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
            $issues[] = 'Contract must be executed to manage retention releases.';
        }
        if ($contract->administration_status !== Contract::ADMIN_STATUS_INITIALIZED) {
            $issues[] = 'Administration baseline must be initialized.';
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
            throw new RuntimeException('Release amount must be greater than zero.');
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
            throw new RuntimeException('Only pending releases can be submitted.');
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
            throw new RuntimeException('Only submitted releases can be approved.');
        }

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
            throw new RuntimeException('Only submitted releases can be rejected.');
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
            throw new RuntimeException('Only approved releases can be marked as released.');
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
