<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Contract;
use App\Services\ActivityLogger;
use App\Services\Contracts\ContractCloseoutService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

final class ContractCloseoutController extends Controller
{
    public function __construct(
        private readonly ContractCloseoutService $closeoutService,
        private readonly ActivityLogger $activityLogger,
    ) {
    }

    public function initializeCloseout(Request $request, Contract $contract): RedirectResponse
    {
        $this->authorize('update', $contract);

        if (! $contract->canInitializeCloseout()) {
            return back()->with('error', __('contracts.closeout.not_eligible'));
        }

        $validated = $request->validate([
            'practical_completion_at' => ['nullable', 'date'],
            'final_completion_at' => ['nullable', 'date'],
            'closeout_notes' => ['nullable', 'string'],
        ]);

        /** @var \App\Models\User $user */
        $user = $request->user();

        try {
            $record = $this->closeoutService->initializeCloseout($contract, $validated, $user);
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        $this->activityLogger->log(
            'contracts.contract.closeout_initialized',
            $contract,
            [],
            [
                'closeout_record_id' => (string) $record->id,
                'closeout_status' => $record->closeout_status,
                'practical_completion_at' => $record->practical_completion_at?->toIso8601String(),
                'final_completion_at' => $record->final_completion_at?->toIso8601String(),
            ],
            $user
        );

        return back()->with('success', __('contracts.closeout.initialized'));
    }

    public function completeCloseout(Request $request, Contract $contract): RedirectResponse
    {
        $this->authorize('update', $contract);

        if (! $contract->canCompleteCloseout()) {
            return back()->with('error', __('contracts.closeout.cannot_complete'));
        }

        $validated = $request->validate([
            'closeout_notes' => ['nullable', 'string'],
        ]);

        /** @var \App\Models\User $user */
        $user = $request->user();

        try {
            $record = $this->closeoutService->completeCloseout(
                $contract,
                $user,
                $validated['closeout_notes'] ?? null
            );
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        $this->activityLogger->log(
            'contracts.contract.closeout_completed',
            $contract,
            ['closeout_status' => Contract::CLOSEOUT_STATUS_READY_FOR_CLOSEOUT],
            [
                'closeout_record_id' => (string) $record->id,
                'closeout_status' => $record->closeout_status,
            ],
            $user
        );

        return back()->with('success', __('contracts.closeout.completed'));
    }
}
