<?php

declare(strict_types=1);

namespace App\Services\Contracts;

use App\Models\Contract;
use App\Models\ContractCloseoutRecord;
use App\Models\User;
use RuntimeException;

final class ContractCloseoutService
{
    /**
     * @return array{is_ready: bool, issues: array<int, string>}
     */
    public function checkCloseoutReadiness(Contract $contract): array
    {
        $issues = [];

        if ($contract->status !== Contract::STATUS_EXECUTED) {
            $issues[] = __('contracts.execution.eligibility.executed_for_closeout');
        }
        if ($contract->administration_status !== Contract::ADMIN_STATUS_INITIALIZED) {
            $issues[] = __('contracts.execution.eligibility.administration_for_closeout');
        }

        return [
            'is_ready' => $issues === [],
            'issues' => $issues,
        ];
    }

    /**
     * @param array{practical_completion_at?: string|null, final_completion_at?: string|null, closeout_notes?: string|null} $payload
     */
    public function initializeCloseout(Contract $contract, array $payload, User $actor): ContractCloseoutRecord
    {
        if ($contract->closeout_status !== Contract::CLOSEOUT_STATUS_NOT_READY) {
            throw new RuntimeException(__('contracts.closeout_already_initialized'));
        }

        $readiness = $this->checkCloseoutReadiness($contract);
        if (! $readiness['is_ready']) {
            throw new RuntimeException(implode(' ', $readiness['issues']));
        }

        $practicalAt = isset($payload['practical_completion_at']) && $payload['practical_completion_at'] !== ''
            ? \Carbon\Carbon::parse($payload['practical_completion_at']) : null;
        $finalAt = isset($payload['final_completion_at']) && $payload['final_completion_at'] !== ''
            ? \Carbon\Carbon::parse($payload['final_completion_at']) : null;
        $notes = $payload['closeout_notes'] ?? null;

        $record = new ContractCloseoutRecord();
        $record->contract_id = $contract->id;
        $record->closeout_status = Contract::CLOSEOUT_STATUS_READY_FOR_CLOSEOUT;
        $record->practical_completion_at = $practicalAt;
        $record->final_completion_at = $finalAt;
        $record->closeout_notes = $notes;
        $record->prepared_by_user_id = $actor->id;
        $record->prepared_at = now();
        $record->save();

        $contract->closeout_status = Contract::CLOSEOUT_STATUS_READY_FOR_CLOSEOUT;
        $contract->closeout_initialized_at = now();
        $contract->closeout_initialized_by_user_id = $actor->id;
        $contract->practical_completion_at = $practicalAt;
        $contract->final_completion_at = $finalAt;
        $contract->closeout_notes = $notes;
        $contract->save();

        return $record;
    }

    public function completeCloseout(Contract $contract, User $actor, ?string $notes = null): ContractCloseoutRecord
    {
        if ($contract->closeout_status !== Contract::CLOSEOUT_STATUS_READY_FOR_CLOSEOUT) {
            throw new RuntimeException(__('contracts.execution.errors.closeout_complete_only_when_ready'));
        }

        $record = new ContractCloseoutRecord();
        $record->contract_id = $contract->id;
        $record->closeout_status = Contract::CLOSEOUT_STATUS_CLOSED_OUT;
        $record->practical_completion_at = $contract->practical_completion_at;
        $record->final_completion_at = $contract->final_completion_at;
        $record->closeout_notes = $notes !== null ? $notes : $contract->closeout_notes;
        $record->prepared_by_user_id = $actor->id;
        $record->prepared_at = now();
        $record->save();

        $contract->closeout_status = Contract::CLOSEOUT_STATUS_CLOSED_OUT;
        $contract->closeout_completed_at = now();
        $contract->closeout_completed_by_user_id = $actor->id;
        $contract->save();

        return $record;
    }
}
