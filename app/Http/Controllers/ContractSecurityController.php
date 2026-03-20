<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Contract;
use App\Models\ContractSecurity;
use App\Services\ActivityLogger;
use App\Services\Contracts\ContractSecurityService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

final class ContractSecurityController extends Controller
{
    public function __construct(
        private readonly ContractSecurityService $securityService,
        private readonly ActivityLogger $activityLogger,
    ) {
    }

    public function store(Request $request, Contract $contract): RedirectResponse
    {
        $this->authorize('update', $contract);
        if (! $contract->canManageSecurities()) {
            return back()->with('error', __('contracts.securities.not_eligible'));
        }
        $validated = $request->validate([
            'instrument_type' => ['required', 'string', 'in:performance_bond,advance_payment_guarantee,retention_bond,insurance'],
            'provider_name' => ['required', 'string', 'max:255'],
            'reference_no' => ['required', 'string', 'max:255'],
            'amount' => ['nullable', 'numeric', 'min:0'],
            'currency' => ['nullable', 'string', 'max:10'],
            'issued_at' => ['nullable', 'date'],
            'expires_at' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
        ]);
        /** @var \App\Models\User $user */
        $user = $request->user();
        try {
            $security = $this->securityService->createSecurity($contract, $validated, $user);
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }
        $this->activityLogger->log('contracts.contract.security_created', $contract, [], ['security_id' => (string) $security->id, 'instrument_type' => $security->instrument_type, 'reference_no' => $security->reference_no], $user);
        return back()->with('success', __('contracts.securities.created'));
    }

    public function update(Request $request, Contract $contract, ContractSecurity $security): RedirectResponse
    {
        $this->authorize('update', $contract);
        if ($security->contract_id !== $contract->id) {
            return back()->with('error', __('contracts.securities.not_found'));
        }
        $validated = $request->validate([
            'instrument_type' => ['sometimes', 'string', 'in:performance_bond,advance_payment_guarantee,retention_bond,insurance'],
            'provider_name' => ['sometimes', 'string', 'max:255'],
            'reference_no' => ['sometimes', 'string', 'max:255'],
            'amount' => ['nullable', 'numeric', 'min:0'],
            'currency' => ['nullable', 'string', 'max:10'],
            'issued_at' => ['nullable', 'date'],
            'expires_at' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
        ]);
        /** @var \App\Models\User $user */
        $user = $request->user();
        try {
            $security = $this->securityService->updateSecurity($security, $validated, $user);
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }
        $this->activityLogger->log('contracts.contract.security_updated', $contract, [], ['security_id' => (string) $security->id, 'reference_no' => $security->reference_no], $user);
        return back()->with('success', __('contracts.securities.updated'));
    }

    public function updateStatus(Request $request, Contract $contract, ContractSecurity $security): RedirectResponse
    {
        $this->authorize('update', $contract);
        if ($security->contract_id !== $contract->id) {
            return back()->with('error', __('contracts.securities.not_found'));
        }
        $validated = $request->validate([
            'status' => ['required', 'string', 'in:active,expiring,expired,released'],
        ]);
        /** @var \App\Models\User $user */
        $user = $request->user();
        try {
            $security = $this->securityService->updateStatus($security, $validated['status'], $user);
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }
        $this->activityLogger->log('contracts.contract.security_status_changed', $contract, [], ['security_id' => (string) $security->id, 'reference_no' => $security->reference_no, 'status' => $security->status], $user);
        return back()->with('success', __('contracts.securities.status_updated'));
    }
}
