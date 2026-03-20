<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Contract;
use App\Models\ContractSignatory;
use App\Services\ActivityLogger;
use App\Services\Contracts\ContractSignatureTrackingService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

final class ContractSignatureController extends Controller
{
    public function __construct(
        private readonly ContractSignatureTrackingService $signatureTracking,
        private readonly ActivityLogger $activityLogger,
    ) {
    }

    public function storeSignatory(Request $request, Contract $contract): RedirectResponse
    {
        $this->authorize('update', $contract);

        if ($contract->status === Contract::STATUS_EXECUTED) {
            return back()->with('error', __('contracts.execution.already_executed'));
        }

        $validated = $request->validate([
            'signatory_type' => ['required', 'string', 'in:internal,supplier'],
            'name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'string', 'email', 'max:255'],
            'title' => ['nullable', 'string', 'max:255'],
            'sign_order' => ['required', 'integer', 'min:0'],
            'is_required' => ['sometimes', 'boolean'],
            'notes' => ['nullable', 'string'],
        ]);

        /** @var \App\Models\User $user */
        $user = $request->user();

        $oldContractStatus = $contract->status;

        try {
            $signatory = $this->signatureTracking->addSignatory($contract, $validated, $user);
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        $this->activityLogger->log(
            'contracts.contract.signatory_added',
            $contract,
            [],
            [
                'signatory_id' => (string) $signatory->id,
                'signatory_type' => $signatory->signatory_type,
                'name' => $signatory->name,
            ],
            $user
        );

        $contract->refresh();
        if ($contract->status !== $oldContractStatus) {
            $this->activityLogger->log(
                'contracts.contract.signature_status_changed',
                $contract,
                ['status' => $oldContractStatus],
                ['status' => $contract->status],
                $user
            );
        }

        return back()->with('success', __('contracts.signatory.added'));
    }

    public function updateSignatory(Request $request, Contract $contract, ContractSignatory $signatory): RedirectResponse
    {
        $this->authorize('update', $contract);

        if ($contract->status === Contract::STATUS_EXECUTED) {
            return back()->with('error', __('contracts.execution.already_executed'));
        }

        if ($signatory->contract_id !== $contract->id) {
            abort(404);
        }

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['nullable', 'string', 'email', 'max:255'],
            'title' => ['nullable', 'string', 'max:255'],
            'sign_order' => ['sometimes', 'integer', 'min:0'],
            'is_required' => ['sometimes', 'boolean'],
            'notes' => ['nullable', 'string'],
        ]);

        /** @var \App\Models\User $user */
        $user = $request->user();

        try {
            $this->signatureTracking->updateSignatory($contract, $signatory, $validated, $user);
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        $this->activityLogger->log(
            'contracts.contract.signatory_updated',
            $contract,
            [],
            ['signatory_id' => (string) $signatory->id],
            $user
        );

        return back()->with('success', __('contracts.signatory.updated'));
    }

    public function markSignatoryStatus(Request $request, Contract $contract, ContractSignatory $signatory): RedirectResponse
    {
        $this->authorize('update', $contract);

        if ($contract->status === Contract::STATUS_EXECUTED) {
            return back()->with('error', __('contracts.execution.already_executed'));
        }

        if ($signatory->contract_id !== $contract->id) {
            abort(404);
        }

        $validated = $request->validate([
            'status' => ['required', 'string', 'in:signed,declined,skipped'],
            'notes' => ['nullable', 'string'],
        ]);

        /** @var \App\Models\User $user */
        $user = $request->user();
        $oldSignatoryStatus = $signatory->status;
        $oldContractStatus = $contract->status;

        try {
            $this->signatureTracking->markSignatoryStatus(
                $contract,
                $signatory,
                $validated['status'],
                $user,
                $validated['notes'] ?? null
            );
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        $signatory->refresh();
        $contract->refresh();

        $this->activityLogger->log(
            'contracts.contract.signatory_status_changed',
            $contract,
            ['signatory_id' => (string) $signatory->id, 'old_status' => $oldSignatoryStatus],
            ['signatory_id' => (string) $signatory->id, 'new_status' => $signatory->status],
            $user
        );

        if ($contract->status !== $oldContractStatus) {
            $this->activityLogger->log(
                'contracts.contract.signature_status_changed',
                $contract,
                ['status' => $oldContractStatus],
                ['status' => $contract->status],
                $user
            );
        }

        return back()->with('success', __('contracts.signatory.status_updated'));
    }

    public function markExecuted(Request $request, Contract $contract): RedirectResponse
    {
        $this->authorize('update', $contract);

        if ($contract->status === Contract::STATUS_EXECUTED) {
            return back()->with('error', __('contracts.execution.already_executed'));
        }

        $validated = $request->validate([
            'notes' => ['nullable', 'string'],
        ]);

        /** @var \App\Models\User $user */
        $user = $request->user();

        try {
            $this->signatureTracking->markExecuted(
                $contract,
                $user,
                $validated['notes'] ?? null
            );
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        $this->activityLogger->log(
            'contracts.contract.executed',
            $contract,
            [],
            ['executed_at' => $contract->executed_at?->toIso8601String()],
            $user
        );

        return back()->with('success', __('contracts.execution.marked'));
    }
}
