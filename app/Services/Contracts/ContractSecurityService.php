<?php

declare(strict_types=1);

namespace App\Services\Contracts;

use App\Models\Contract;
use App\Models\ContractSecurity;
use App\Models\User;
use RuntimeException;

final class ContractSecurityService
{
    /**
     * @return array{is_ready: bool, issues: array<int, string>}
     */
    public function checkSecurityEligibility(Contract $contract): array
    {
        $issues = [];
        if ($contract->status !== Contract::STATUS_EXECUTED) {
            $issues[] = __('contracts.execution.eligibility.executed_for_securities');
        }
        if ($contract->administration_status !== Contract::ADMIN_STATUS_INITIALIZED) {
            $issues[] = __('contracts.execution.eligibility.administration_for_securities');
        }
        return ['is_ready' => $issues === [], 'issues' => $issues];
    }

    /**
     * @param array{
     *     instrument_type: string,
     *     provider_name: string,
     *     reference_no: string,
     *     amount?: float|string|null,
     *     currency?: string|null,
     *     issued_at?: string|null,
     *     expires_at?: string|null,
     *     notes?: string|null
     * } $payload
     */
    public function createSecurity(Contract $contract, array $payload, User $actor): ContractSecurity
    {
        $eligibility = $this->checkSecurityEligibility($contract);
        if (! $eligibility['is_ready']) {
            throw new RuntimeException(implode(' ', $eligibility['issues']));
        }
        if (! in_array($payload['instrument_type'], ContractSecurity::INSTRUMENT_TYPES, true)) {
            throw new RuntimeException('Invalid instrument type.');
        }
        $security = new ContractSecurity();
        $security->contract_id = $contract->id;
        $security->instrument_type = $payload['instrument_type'];
        $security->status = ContractSecurity::STATUS_ACTIVE;
        $security->provider_name = $payload['provider_name'];
        $security->reference_no = $payload['reference_no'];
        $security->amount = isset($payload['amount']) && $payload['amount'] !== '' ? (float) $payload['amount'] : null;
        $security->currency = $payload['currency'] ?? null;
        $security->issued_at = isset($payload['issued_at']) && $payload['issued_at'] !== '' ? $payload['issued_at'] : null;
        $security->expires_at = isset($payload['expires_at']) && $payload['expires_at'] !== '' ? $payload['expires_at'] : null;
        $security->notes = $payload['notes'] ?? null;
        $security->created_by_user_id = $actor->id;
        $security->updated_by_user_id = $actor->id;
        $security->save();
        return $security;
    }

    /**
     * @param array{
     *     instrument_type?: string,
     *     provider_name?: string,
     *     reference_no?: string,
     *     amount?: float|string|null,
     *     currency?: string|null,
     *     issued_at?: string|null,
     *     expires_at?: string|null,
     *     notes?: string|null
     * } $payload
     */
    public function updateSecurity(ContractSecurity $security, array $payload, User $actor): ContractSecurity
    {
        if (isset($payload['instrument_type']) && in_array($payload['instrument_type'], ContractSecurity::INSTRUMENT_TYPES, true)) {
            $security->instrument_type = $payload['instrument_type'];
        }
        if (array_key_exists('provider_name', $payload)) {
            $security->provider_name = $payload['provider_name'];
        }
        if (array_key_exists('reference_no', $payload)) {
            $security->reference_no = $payload['reference_no'];
        }
        if (array_key_exists('amount', $payload)) {
            $security->amount = $payload['amount'] !== null && $payload['amount'] !== '' ? (float) $payload['amount'] : null;
        }
        if (array_key_exists('currency', $payload)) {
            $security->currency = $payload['currency'];
        }
        if (array_key_exists('issued_at', $payload)) {
            $security->issued_at = $payload['issued_at'] !== null && $payload['issued_at'] !== '' ? $payload['issued_at'] : null;
        }
        if (array_key_exists('expires_at', $payload)) {
            $security->expires_at = $payload['expires_at'] !== null && $payload['expires_at'] !== '' ? $payload['expires_at'] : null;
        }
        if (array_key_exists('notes', $payload)) {
            $security->notes = $payload['notes'];
        }
        $security->updated_by_user_id = $actor->id;
        $security->save();
        return $security;
    }

    public function updateStatus(ContractSecurity $security, string $status, User $actor): ContractSecurity
    {
        if (! in_array($status, ContractSecurity::STATUSES, true)) {
            throw new RuntimeException('Invalid status.');
        }
        $security->status = $status;
        if ($status === ContractSecurity::STATUS_RELEASED && $security->released_at === null) {
            $security->released_at = now();
        }
        $security->updated_by_user_id = $actor->id;
        $security->save();
        return $security;
    }
}
