<?php

declare(strict_types=1);

namespace App\Services\Contracts;

use App\Models\Contract;
use App\Models\ContractAdministrationBaseline;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use RuntimeException;

final class ContractAdministrationBaselineService
{
    /**
     * @return array{is_ready: bool, issues: array<int, string>}
     */
    public function checkAdministrationReadiness(Contract $contract): array
    {
        $issues = [];

        if ($contract->status !== Contract::STATUS_EXECUTED) {
            $issues[] = 'Contract must be executed before administration can be initialized.';
        }
        if ($contract->supplier_id === null) {
            $issues[] = 'Contract must have a supplier.';
        }
        if ($contract->contract_number === null || trim((string) $contract->contract_number) === '') {
            $issues[] = 'Contract number is required.';
        }

        return [
            'is_ready' => $issues === [],
            'issues' => $issues,
        ];
    }

    /**
     * @param array{
     *     effective_date?: string|null,
     *     commencement_date?: string|null,
     *     completion_date_planned?: string|null,
     *     contract_value_final?: string|float|null,
     *     currency_final?: string|null,
     *     supplier_reference_no?: string|null,
     *     administration_notes?: string|null
     * } $payload
     */
    public function initializeAdministrationBaseline(Contract $contract, array $payload, User $actor): ContractAdministrationBaseline
    {
        if ($contract->status !== Contract::STATUS_EXECUTED) {
            throw new RuntimeException('Contract must be executed before administration baseline can be initialized.');
        }

        $readiness = $this->checkAdministrationReadiness($contract);
        if (! $readiness['is_ready']) {
            throw new RuntimeException(implode(' ', $readiness['issues']));
        }

        $contractValueFinal = isset($payload['contract_value_final'])
            ? (is_numeric($payload['contract_value_final']) ? (float) $payload['contract_value_final'] : null)
            : $contract->contract_value;
        $currencyFinal = $payload['currency_final'] ?? $contract->currency;
        if ($contractValueFinal === null || $currencyFinal === null || trim((string) $currencyFinal) === '') {
            throw new RuntimeException('Contract value and currency are required for administration baseline.');
        }

        return DB::transaction(function () use ($contract, $payload, $actor, $contractValueFinal, $currencyFinal): ContractAdministrationBaseline {
            $version = $this->nextBaselineVersion($contract);

            $effectiveDate = isset($payload['effective_date']) && $payload['effective_date'] !== ''
                ? \Carbon\Carbon::parse($payload['effective_date']) : null;
            $commencementDate = isset($payload['commencement_date']) && $payload['commencement_date'] !== ''
                ? \Carbon\Carbon::parse($payload['commencement_date']) : null;
            $completionDatePlanned = isset($payload['completion_date_planned']) && $payload['completion_date_planned'] !== ''
                ? \Carbon\Carbon::parse($payload['completion_date_planned']) : null;

            $baseline = new ContractAdministrationBaseline();
            $baseline->contract_id = $contract->id;
            $baseline->baseline_version = $version;
            $baseline->administration_status = ContractAdministrationBaseline::ADMIN_STATUS_INITIALIZED;
            $baseline->effective_date = $effectiveDate;
            $baseline->commencement_date = $commencementDate;
            $baseline->completion_date_planned = $completionDatePlanned;
            $baseline->contract_value_final = $contractValueFinal;
            $baseline->currency_final = $currencyFinal;
            $baseline->supplier_reference_no = isset($payload['supplier_reference_no']) ? trim((string) $payload['supplier_reference_no']) : null;
            $baseline->administration_notes = isset($payload['administration_notes']) ? trim((string) $payload['administration_notes']) : null;
            $baseline->prepared_by_user_id = $actor->id;
            $baseline->prepared_at = now();
            $baseline->save();

            $contract->administration_status = Contract::ADMIN_STATUS_INITIALIZED;
            $contract->administration_initialized_at = now();
            $contract->administration_initialized_by_user_id = $actor->id;
            $contract->administration_notes = $baseline->administration_notes;
            $contract->effective_date = $effectiveDate;
            $contract->commencement_date = $commencementDate;
            $contract->completion_date_planned = $completionDatePlanned;
            $contract->contract_value_final = $contractValueFinal;
            $contract->currency_final = $currencyFinal;
            $contract->supplier_reference_no = $baseline->supplier_reference_no;
            $contract->save();

            return $baseline;
        });
    }

    public function nextBaselineVersion(Contract $contract): int
    {
        /** @var int|null $max */
        $max = ContractAdministrationBaseline::query()
            ->where('contract_id', $contract->id)
            ->max('baseline_version');

        return $max === null ? 1 : $max + 1;
    }
}
