<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Contract;
use App\Models\ContractRetentionRelease;
use App\Services\ActivityLogger;
use App\Services\Contracts\ContractRetentionReleaseService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

final class ContractRetentionReleaseController extends Controller
{
    public function __construct(
        private readonly ContractRetentionReleaseService $retentionService,
        private readonly ActivityLogger $activityLogger,
    ) {
    }

    public function store(Request $request, Contract $contract): RedirectResponse
    {
        $this->authorize('update', $contract);

        if (! $contract->canManageRetentionReleases()) {
            return back()->with('error', __('contracts.retention.not_eligible'));
        }

        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01'],
            'currency' => ['required', 'string', 'max:10'],
            'reason' => ['nullable', 'string'],
        ]);

        /** @var \App\Models\User $user */
        $user = $request->user();

        try {
            $release = $this->retentionService->createReleaseRequest($contract, $validated, $user);
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        $this->activityLogger->log(
            'contracts.contract.retention_release_created',
            $contract,
            [],
            [
                'release_id' => (string) $release->id,
                'release_no' => $release->release_no,
                'amount' => (string) $release->amount,
                'currency' => $release->currency,
            ],
            $user
        );

        return back()->with('success', __('contracts.retention.created'));
    }

    public function submit(Request $request, Contract $contract, ContractRetentionRelease $release): RedirectResponse
    {
        $this->authorize('update', $contract);

        if ($release->contract_id !== $contract->id) {
            return back()->with('error', __('contracts.retention.not_found'));
        }

        /** @var \App\Models\User $user */
        $user = $request->user();

        try {
            $release = $this->retentionService->submitRelease($release, $user);
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        $this->activityLogger->log(
            'contracts.contract.retention_release_submitted',
            $contract,
            [],
            ['release_id' => (string) $release->id, 'release_no' => $release->release_no],
            $user
        );

        return back()->with('success', __('contracts.retention.submitted'));
    }

    public function approve(Request $request, Contract $contract, ContractRetentionRelease $release): RedirectResponse
    {
        $this->authorize('update', $contract);

        if ($release->contract_id !== $contract->id) {
            return back()->with('error', __('contracts.retention.not_found'));
        }

        $validated = $request->validate(['decision_notes' => ['nullable', 'string']]);

        /** @var \App\Models\User $user */
        $user = $request->user();

        try {
            $release = $this->retentionService->approveRelease($release, $user, $validated['decision_notes'] ?? null);
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        $this->activityLogger->log(
            'contracts.contract.retention_release_approved',
            $contract,
            [],
            ['release_id' => (string) $release->id, 'release_no' => $release->release_no],
            $user
        );

        return back()->with('success', __('contracts.retention.approved'));
    }

    public function reject(Request $request, Contract $contract, ContractRetentionRelease $release): RedirectResponse
    {
        $this->authorize('update', $contract);

        if ($release->contract_id !== $contract->id) {
            return back()->with('error', __('contracts.retention.not_found'));
        }

        $validated = $request->validate(['decision_notes' => ['nullable', 'string']]);

        /** @var \App\Models\User $user */
        $user = $request->user();

        try {
            $release = $this->retentionService->rejectRelease($release, $user, $validated['decision_notes'] ?? null);
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        $this->activityLogger->log(
            'contracts.contract.retention_release_rejected',
            $contract,
            [],
            ['release_id' => (string) $release->id, 'release_no' => $release->release_no],
            $user
        );

        return back()->with('success', __('contracts.retention.rejected'));
    }

    public function markReleased(Request $request, Contract $contract, ContractRetentionRelease $release): RedirectResponse
    {
        $this->authorize('update', $contract);

        if ($release->contract_id !== $contract->id) {
            return back()->with('error', __('contracts.retention.not_found'));
        }

        $validated = $request->validate(['decision_notes' => ['nullable', 'string']]);

        /** @var \App\Models\User $user */
        $user = $request->user();

        try {
            $release = $this->retentionService->markReleased($release, $user, $validated['decision_notes'] ?? null);
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        $this->activityLogger->log(
            'contracts.contract.retention_release_marked_released',
            $contract,
            [],
            ['release_id' => (string) $release->id, 'release_no' => $release->release_no],
            $user
        );

        return back()->with('success', __('contracts.retention.marked_released'));
    }
}
