<?php

declare(strict_types=1);

namespace App\Services\Procurement;

use App\Models\Contract;
use App\Models\User;
use RuntimeException;

final class ContractLifecycleService
{
    public function __construct(
        private readonly ContractEventService $contractEventService
    ) {}

    public function sendForSignature(Contract $contract, User $actor): void
    {
        $this->assertTransition($contract->status, Contract::STATUS_PENDING_SIGNATURE, [
            Contract::STATUS_DRAFT,
        ]);

        $previous = $contract->status;
        $contract->update(['status' => Contract::STATUS_PENDING_SIGNATURE]);

        $this->logActivity($contract, 'contract_sent_for_signature', $previous, Contract::STATUS_PENDING_SIGNATURE, $actor);
    }

    public function activateContract(Contract $contract, User $actor): void
    {
        $this->assertTransition($contract->status, Contract::STATUS_ACTIVE, [
            Contract::STATUS_PENDING_SIGNATURE,
        ]);

        $previous = $contract->status;
        $contract->update([
            'status'   => Contract::STATUS_ACTIVE,
            'signed_at' => $contract->signed_at ?? now(),
        ]);

        $this->logActivity($contract, 'contract_activated', $previous, Contract::STATUS_ACTIVE, $actor);
        $this->contractEventService->contractActivated($contract);
    }

    public function completeContract(Contract $contract, User $actor): void
    {
        $this->assertTransition($contract->status, Contract::STATUS_COMPLETED, [
            Contract::STATUS_ACTIVE,
        ]);

        $previous = $contract->status;
        $contract->update(['status' => Contract::STATUS_COMPLETED]);

        $this->logActivity($contract, 'contract_completed', $previous, Contract::STATUS_COMPLETED, $actor);
    }

    public function terminateContract(Contract $contract, User $actor, string $reason): void
    {
        $this->assertTransition($contract->status, Contract::STATUS_TERMINATED, [
            Contract::STATUS_ACTIVE,
        ]);

        $previous = $contract->status;
        $contract->update(['status' => Contract::STATUS_TERMINATED]);

        $this->logActivity($contract, 'contract_terminated', $previous, Contract::STATUS_TERMINATED, $actor, [
            'reason' => $reason,
        ]);
    }

    /**
     * @param  array<string>  $allowedFrom
     */
    private function assertTransition(string $current, string $newStatus, array $allowedFrom): void
    {
        if (! in_array($current, $allowedFrom, true)) {
            throw new RuntimeException(
                "Invalid contract status transition: cannot move from '{$current}' to '{$newStatus}'."
            );
        }
    }

    private function logActivity(
        Contract $contract,
        string $activityType,
        string $previousStatus,
        string $newStatus,
        User $actor,
        array $extraMetadata = []
    ): void {
        $contract->activities()->create([
            'activity_type' => $activityType,
            'description'   => "Status changed from {$previousStatus} to {$newStatus}.",
            'metadata'      => array_merge([
                'contract_id'     => $contract->id,
                'previous_status' => $previousStatus,
                'new_status'      => $newStatus,
            ], $extraMetadata),
            'actor_type' => $actor->getMorphClass(),
            'actor_id'   => (string) $actor->getKey(),
        ]);
    }
}
