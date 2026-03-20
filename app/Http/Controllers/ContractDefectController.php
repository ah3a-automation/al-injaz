<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Contract;
use App\Models\ContractDefectItem;
use App\Services\ActivityLogger;
use App\Services\Contracts\ContractDefectService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

final class ContractDefectController extends Controller
{
    public function __construct(
        private readonly ContractDefectService $defectService,
        private readonly ActivityLogger $activityLogger,
    ) {
    }

    public function initializeWarrantyWindow(Request $request, Contract $contract): RedirectResponse
    {
        $this->authorize('update', $contract);

        if (! $contract->canManageDefects()) {
            return back()->with('error', __('contracts.defects.not_eligible'));
        }

        $validated = $request->validate([
            'defects_liability_start_at' => ['nullable', 'date'],
            'defects_liability_end_at' => ['nullable', 'date', 'after_or_equal:defects_liability_start_at'],
        ]);

        /** @var \App\Models\User $user */
        $user = $request->user();

        try {
            $this->defectService->initializeWarrantyWindow($contract, $validated, $user);
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        $this->activityLogger->log(
            'contracts.contract.warranty_initialized',
            $contract,
            [],
            [
                'defects_liability_start_at' => $contract->fresh()->defects_liability_start_at?->toIso8601String(),
                'defects_liability_end_at' => $contract->fresh()->defects_liability_end_at?->toIso8601String(),
            ],
            $user
        );

        return back()->with('success', __('contracts.defects.warranty_initialized'));
    }

    public function storeDefect(Request $request, Contract $contract): RedirectResponse
    {
        $this->authorize('update', $contract);

        if (! $contract->canManageDefects()) {
            return back()->with('error', __('contracts.defects.not_eligible'));
        }

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
        ]);

        /** @var \App\Models\User $user */
        $user = $request->user();

        try {
            $item = $this->defectService->createDefectItem($contract, $validated, $user);
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        $this->activityLogger->log(
            'contracts.contract.defect_created',
            $contract,
            [],
            [
                'defect_item_id' => (string) $item->id,
                'reference_no' => $item->reference_no,
                'title' => $item->title,
            ],
            $user
        );

        return back()->with('success', __('contracts.defects.defect_created'));
    }

    public function updateDefectStatus(Request $request, Contract $contract, ContractDefectItem $defect): RedirectResponse
    {
        $this->authorize('update', $contract);

        if ($defect->contract_id !== $contract->id) {
            return back()->with('error', __('contracts.defects.not_found'));
        }

        $validated = $request->validate([
            'status' => ['required', 'string', 'in:in_progress,resolved,closed'],
            'event_notes' => ['nullable', 'string'],
        ]);

        $oldStatus = $defect->status;

        /** @var \App\Models\User $user */
        $user = $request->user();

        try {
            $defect = $this->defectService->updateDefectStatus(
                $defect,
                $validated['status'],
                $user,
                $validated['event_notes'] ?? null
            );
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        $this->activityLogger->log(
            'contracts.contract.defect_status_changed',
            $contract,
            ['status' => $oldStatus],
            [
                'defect_item_id' => (string) $defect->id,
                'reference_no' => $defect->reference_no,
                'status' => $defect->status,
            ],
            $user
        );

        return back()->with('success', __('contracts.defects.status_updated'));
    }
}
