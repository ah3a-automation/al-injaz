<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Contract;
use App\Services\ActivityLogger;
use App\Services\Contracts\ContractAdministrationBaselineService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

final class ContractAdministrationController extends Controller
{
    public function __construct(
        private readonly ContractAdministrationBaselineService $administrationBaselineService,
        private readonly ActivityLogger $activityLogger,
    ) {
    }

    public function initializeAdministrationBaseline(Request $request, Contract $contract): RedirectResponse
    {
        $this->authorize('update', $contract);

        if ($contract->status !== Contract::STATUS_EXECUTED) {
            return back()->with('error', __('contracts.administration.not_executed'));
        }

        $validated = $request->validate([
            'effective_date' => ['nullable', 'date'],
            'commencement_date' => ['nullable', 'date'],
            'completion_date_planned' => ['nullable', 'date'],
            'contract_value_final' => ['required', 'numeric', 'min:0'],
            'currency_final' => ['required', 'string', 'max:10'],
            'supplier_reference_no' => ['nullable', 'string', 'max:255'],
            'administration_notes' => ['nullable', 'string'],
        ]);

        /** @var \App\Models\User $user */
        $user = $request->user();

        try {
            $baseline = $this->administrationBaselineService->initializeAdministrationBaseline(
                $contract,
                $validated,
                $user
            );
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        $this->activityLogger->log(
            'contracts.contract.administration_initialized',
            $contract,
            [],
            [
                'baseline_id' => (string) $baseline->id,
                'baseline_version' => $baseline->baseline_version,
                'administration_status' => $baseline->administration_status,
                'effective_date' => $baseline->effective_date?->toIso8601String(),
                'commencement_date' => $baseline->commencement_date?->toIso8601String(),
                'completion_date_planned' => $baseline->completion_date_planned?->toIso8601String(),
                'contract_value_final' => $baseline->contract_value_final !== null ? (string) $baseline->contract_value_final : null,
                'currency_final' => $baseline->currency_final,
            ],
            $user
        );

        return back()->with('success', __('contracts.administration.initialized'));
    }
}
