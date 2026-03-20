<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Contract;
use App\Models\ContractObligation;
use App\Services\ActivityLogger;
use App\Services\Contracts\ContractObligationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

final class ContractObligationController extends Controller
{
    public function __construct(
        private readonly ContractObligationService $obligationService,
        private readonly ActivityLogger $activityLogger,
    ) {
    }

    public function store(Request $request, Contract $contract): RedirectResponse
    {
        $this->authorize('update', $contract);
        if (! $contract->canManageObligations()) {
            return back()->with('error', __('contracts.obligations.not_eligible'));
        }
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'party_type' => ['required', 'string', 'in:internal,supplier,client,consultant'],
            'due_at' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
        ]);
        /** @var \App\Models\User $user */
        $user = $request->user();
        try {
            $obligation = $this->obligationService->createObligation($contract, $validated, $user);
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }
        $this->activityLogger->log('contracts.contract.obligation_created', $contract, [], ['obligation_id' => (string) $obligation->id, 'reference_no' => $obligation->reference_no], $user);
        return back()->with('success', __('contracts.obligations.created'));
    }

    public function update(Request $request, Contract $contract, ContractObligation $obligation): RedirectResponse
    {
        $this->authorize('update', $contract);
        if ($obligation->contract_id !== $contract->id) {
            return back()->with('error', __('contracts.obligations.not_found'));
        }
        $validated = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'party_type' => ['sometimes', 'string', 'in:internal,supplier,client,consultant'],
            'due_at' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
        ]);
        /** @var \App\Models\User $user */
        $user = $request->user();
        try {
            $obligation = $this->obligationService->updateObligation($obligation, $validated, $user);
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }
        $this->activityLogger->log('contracts.contract.obligation_updated', $contract, [], ['obligation_id' => (string) $obligation->id, 'reference_no' => $obligation->reference_no], $user);
        return back()->with('success', __('contracts.obligations.updated'));
    }

    public function updateStatus(Request $request, Contract $contract, ContractObligation $obligation): RedirectResponse
    {
        $this->authorize('update', $contract);
        if ($obligation->contract_id !== $contract->id) {
            return back()->with('error', __('contracts.obligations.not_found'));
        }
        $validated = $request->validate([
            'status' => ['required', 'string', 'in:not_started,in_progress,submitted,fulfilled,overdue'],
        ]);
        /** @var \App\Models\User $user */
        $user = $request->user();
        try {
            $obligation = $this->obligationService->updateStatus($obligation, $validated['status'], $user);
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }
        $this->activityLogger->log('contracts.contract.obligation_status_changed', $contract, [], ['obligation_id' => (string) $obligation->id, 'reference_no' => $obligation->reference_no, 'status' => $obligation->status], $user);
        return back()->with('success', __('contracts.obligations.status_updated'));
    }
}
