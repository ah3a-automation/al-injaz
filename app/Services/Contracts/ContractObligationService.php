<?php

declare(strict_types=1);

namespace App\Services\Contracts;

use App\Models\Contract;
use App\Models\ContractObligation;
use App\Models\User;
use RuntimeException;

final class ContractObligationService
{
    /** @return array{is_ready: bool, issues: array<int, string>} */
    public function checkObligationEligibility(Contract $contract): array
    {
        $issues = [];
        if ($contract->status !== Contract::STATUS_EXECUTED) {
            $issues[] = __('contracts.execution.eligibility.executed_for_obligations');
        }
        if ($contract->administration_status !== Contract::ADMIN_STATUS_INITIALIZED) {
            $issues[] = __('contracts.execution.eligibility.administration_for_obligations');
        }
        return ['is_ready' => $issues === [], 'issues' => $issues];
    }

    /** @param array{title: string, description?: string|null, party_type: string, due_at?: string|null, notes?: string|null} $payload */
    public function createObligation(Contract $contract, array $payload, User $actor): ContractObligation
    {
        $eligibility = $this->checkObligationEligibility($contract);
        if (! $eligibility['is_ready']) {
            throw new RuntimeException(implode(' ', $eligibility['issues']));
        }
        if (! in_array($payload['party_type'], ContractObligation::PARTY_TYPES, true)) {
            throw new RuntimeException(__('contracts.execution.errors.obligation_invalid_party_type'));
        }
        $obligation = new ContractObligation();
        $obligation->contract_id = $contract->id;
        $obligation->reference_no = $this->nextReferenceNumber($contract);
        $obligation->title = $payload['title'];
        $obligation->description = $payload['description'] ?? null;
        $obligation->party_type = $payload['party_type'];
        $obligation->status = ContractObligation::STATUS_NOT_STARTED;
        $obligation->due_at = isset($payload['due_at']) && $payload['due_at'] !== '' ? $payload['due_at'] : null;
        $obligation->notes = $payload['notes'] ?? null;
        $obligation->created_by_user_id = $actor->id;
        $obligation->updated_by_user_id = $actor->id;
        $obligation->save();
        return $obligation;
    }

    /** @param array{title?: string, description?: string|null, party_type?: string, due_at?: string|null, notes?: string|null} $payload */
    public function updateObligation(ContractObligation $obligation, array $payload, User $actor): ContractObligation
    {
        if (isset($payload['title'])) {
            $obligation->title = $payload['title'];
        }
        if (array_key_exists('description', $payload)) {
            $obligation->description = $payload['description'];
        }
        if (isset($payload['party_type']) && in_array($payload['party_type'], ContractObligation::PARTY_TYPES, true)) {
            $obligation->party_type = $payload['party_type'];
        }
        if (array_key_exists('due_at', $payload)) {
            $obligation->due_at = $payload['due_at'] !== null && $payload['due_at'] !== '' ? $payload['due_at'] : null;
        }
        if (array_key_exists('notes', $payload)) {
            $obligation->notes = $payload['notes'];
        }
        $obligation->updated_by_user_id = $actor->id;
        $obligation->save();
        return $obligation;
    }

    public function updateStatus(ContractObligation $obligation, string $status, User $actor): ContractObligation
    {
        if (! in_array($status, ContractObligation::STATUSES, true)) {
            throw new RuntimeException('Invalid status.');
        }
        $obligation->status = $status;
        if ($status === ContractObligation::STATUS_SUBMITTED && $obligation->submitted_at === null) {
            $obligation->submitted_at = now();
        }
        if ($status === ContractObligation::STATUS_FULFILLED && $obligation->fulfilled_at === null) {
            $obligation->fulfilled_at = now();
        }
        $obligation->updated_by_user_id = $actor->id;
        $obligation->save();
        return $obligation;
    }

    public function nextReferenceNumber(Contract $contract): string
    {
        $maxNo = $contract->obligations()
            ->whereRaw("reference_no ~ '^OBL-[0-9]+$'")
            ->selectRaw("COALESCE(MAX(CAST(SUBSTRING(reference_no FROM 5) AS INTEGER)), 0) AS n")
            ->value('n');
        $next = (int) ($maxNo ?? 0) + 1;
        return 'OBL-' . str_pad((string) $next, 3, '0', STR_PAD_LEFT);
    }
}
