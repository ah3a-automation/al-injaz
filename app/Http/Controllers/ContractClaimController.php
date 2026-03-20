<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Contract;
use App\Models\ContractClaim;
use App\Services\ActivityLogger;
use App\Services\Contracts\ContractClaimService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

final class ContractClaimController extends Controller
{
    public function __construct(
        private readonly ContractClaimService $claimService,
        private readonly ActivityLogger $activityLogger,
    ) {
    }

    public function store(Request $request, Contract $contract): RedirectResponse
    {
        $this->authorize('update', $contract);
        if (! $contract->canManageClaims()) {
            return back()->with('error', __('contracts.claims.not_eligible'));
        }
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
        ]);
        /** @var \App\Models\User $user */
        $user = $request->user();
        try {
            $claim = $this->claimService->createClaim($contract, $validated, $user);
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }
        $this->activityLogger->log('contracts.contract.claim_created', $contract, [], ['claim_id' => (string) $claim->id, 'claim_no' => $claim->claim_no], $user);
        return back()->with('success', __('contracts.claims.created'));
    }

    public function update(Request $request, Contract $contract, ContractClaim $claim): RedirectResponse
    {
        $this->authorize('update', $contract);
        if ($claim->contract_id !== $contract->id) {
            return back()->with('error', __('contracts.claims.not_found'));
        }
        $validated = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
        ]);
        /** @var \App\Models\User $user */
        $user = $request->user();
        try {
            $this->claimService->updateDraftClaim($claim, $validated, $user);
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }
        return back()->with('success', __('contracts.claims.updated'));
    }

    public function submit(Request $request, Contract $contract, ContractClaim $claim): RedirectResponse
    {
        $this->authorize('update', $contract);
        if ($claim->contract_id !== $contract->id) {
            return back()->with('error', __('contracts.claims.not_found'));
        }
        /** @var \App\Models\User $user */
        $user = $request->user();
        try {
            $claim = $this->claimService->submitClaim($claim, $user);
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }
        $this->activityLogger->log('contracts.contract.claim_submitted', $contract, [], ['claim_id' => (string) $claim->id, 'claim_no' => $claim->claim_no], $user);
        return back()->with('success', __('contracts.claims.submitted'));
    }

    public function review(Request $request, Contract $contract, ContractClaim $claim): RedirectResponse
    {
        $this->authorize('update', $contract);
        if ($claim->contract_id !== $contract->id) {
            return back()->with('error', __('contracts.claims.not_found'));
        }
        /** @var \App\Models\User $user */
        $user = $request->user();
        try {
            $claim = $this->claimService->moveToUnderReview($claim, $user);
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }
        $this->activityLogger->log('contracts.contract.claim_under_review', $contract, [], ['claim_id' => (string) $claim->id, 'claim_no' => $claim->claim_no], $user);
        return back()->with('success', __('contracts.claims.under_review'));
    }

    public function resolve(Request $request, Contract $contract, ContractClaim $claim): RedirectResponse
    {
        $this->authorize('update', $contract);
        if ($claim->contract_id !== $contract->id) {
            return back()->with('error', __('contracts.claims.not_found'));
        }
        /** @var \App\Models\User $user */
        $user = $request->user();
        try {
            $claim = $this->claimService->resolveClaim($claim, $user);
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }
        $this->activityLogger->log('contracts.contract.claim_resolved', $contract, [], ['claim_id' => (string) $claim->id, 'claim_no' => $claim->claim_no], $user);
        return back()->with('success', __('contracts.claims.resolved'));
    }

    public function reject(Request $request, Contract $contract, ContractClaim $claim): RedirectResponse
    {
        $this->authorize('update', $contract);
        if ($claim->contract_id !== $contract->id) {
            return back()->with('error', __('contracts.claims.not_found'));
        }
        /** @var \App\Models\User $user */
        $user = $request->user();
        try {
            $claim = $this->claimService->rejectClaim($claim, $user);
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }
        $this->activityLogger->log('contracts.contract.claim_rejected', $contract, [], ['claim_id' => (string) $claim->id, 'claim_no' => $claim->claim_no], $user);
        return back()->with('success', __('contracts.claims.rejected'));
    }
}
