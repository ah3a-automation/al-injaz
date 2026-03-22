<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Contract;
use App\Models\ContractVariation;
use App\Services\ActivityLogger;
use App\Services\Contracts\ContractVariationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

final class ContractVariationController extends Controller
{
    public function __construct(
        private readonly ContractVariationService $variationService,
        private readonly ActivityLogger $activityLogger,
    ) {
    }

    public function store(Request $request, Contract $contract): RedirectResponse
    {
        $this->authorize('create', [ContractVariation::class, $contract]);

        if (! $contract->canManageVariations()) {
            return back()->with('error', __('contracts.variations.not_eligible'));
        }

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'variation_type' => ['required', 'string', 'in:commercial,time,commercial_time,administrative'],
            'reason' => ['nullable', 'string'],
            'description' => ['nullable', 'string'],
            'commercial_delta' => ['nullable', 'numeric'],
            'currency' => ['nullable', 'string', 'max:10'],
            'time_delta_days' => ['nullable', 'integer', 'min:0'],
        ]);

        /** @var \App\Models\User $user */
        $user = $request->user();

        try {
            $variation = $this->variationService->createVariation($contract, $validated, $user);
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        $this->activityLogger->log(
            'contracts.contract.variation_created',
            $contract,
            [],
            [
                'variation_id' => (string) $variation->id,
                'variation_no' => $variation->variation_no,
                'variation_type' => $variation->variation_type,
                'commercial_delta' => $variation->commercial_delta !== null ? (string) $variation->commercial_delta : null,
                'time_delta_days' => $variation->time_delta_days,
            ],
            $user
        );

        return back()->with('success', __('contracts.variations.created'));
    }

    public function update(Request $request, Contract $contract, ContractVariation $variation): RedirectResponse
    {
        $this->authorize('update', $variation);

        if ($variation->contract_id !== $contract->id || ! $variation->isDraft()) {
            return back()->with('error', __('contracts.variations.cannot_edit'));
        }

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'variation_type' => ['required', 'string', 'in:commercial,time,commercial_time,administrative'],
            'reason' => ['nullable', 'string'],
            'description' => ['nullable', 'string'],
            'commercial_delta' => ['nullable', 'numeric'],
            'currency' => ['nullable', 'string', 'max:10'],
            'time_delta_days' => ['nullable', 'integer', 'min:0'],
        ]);

        /** @var \App\Models\User $user */
        $user = $request->user();

        $variation->title = $validated['title'];
        $variation->variation_type = $validated['variation_type'];
        $variation->reason = $validated['reason'] ?? null;
        $variation->description = $validated['description'] ?? null;
        $variation->commercial_delta = isset($validated['commercial_delta']) ? (float) $validated['commercial_delta'] : null;
        $variation->currency = $validated['currency'] ?? null;
        $variation->time_delta_days = (int) ($validated['time_delta_days'] ?? 0);
        $variation->updated_by_user_id = $user->id;
        $variation->save();

        $this->activityLogger->log(
            'contracts.contract.variation_updated',
            $contract,
            [],
            [
                'variation_id' => (string) $variation->id,
                'variation_no' => $variation->variation_no,
            ],
            $user
        );

        return back()->with('success', __('contracts.variations.updated'));
    }

    public function submit(Request $request, Contract $contract, ContractVariation $variation): RedirectResponse
    {
        $this->authorize('submit', $variation);

        if ($variation->contract_id !== $contract->id) {
            return back()->with('error', __('contracts.variations.not_found'));
        }

        /** @var \App\Models\User $user */
        $user = $request->user();

        try {
            $variation = $this->variationService->submitVariation($variation, $user);
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        $this->activityLogger->log(
            'contracts.contract.variation_submitted',
            $contract,
            ['status' => ContractVariation::STATUS_DRAFT],
            [
                'variation_id' => (string) $variation->id,
                'variation_no' => $variation->variation_no,
                'status' => $variation->status,
            ],
            $user
        );

        return back()->with('success', __('contracts.variations.submitted'));
    }

    public function approve(Request $request, Contract $contract, ContractVariation $variation): RedirectResponse
    {
        $this->authorize('approve', $variation);

        if ($variation->contract_id !== $contract->id) {
            return back()->with('error', __('contracts.variations.not_found'));
        }

        $validated = $request->validate([
            'decision_notes' => ['nullable', 'string'],
        ]);

        /** @var \App\Models\User $user */
        $user = $request->user();

        try {
            $variation = $this->variationService->approveVariation(
                $variation,
                $user,
                $validated['decision_notes'] ?? null
            );
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        $this->activityLogger->log(
            'contracts.contract.variation_approved',
            $contract,
            ['status' => ContractVariation::STATUS_SUBMITTED],
            [
                'variation_id' => (string) $variation->id,
                'variation_no' => $variation->variation_no,
                'status' => $variation->status,
                'commercial_delta' => $variation->commercial_delta !== null ? (string) $variation->commercial_delta : null,
                'time_delta_days' => $variation->time_delta_days,
            ],
            $user
        );

        return back()->with('success', __('contracts.variations.approved'));
    }

    public function reject(Request $request, Contract $contract, ContractVariation $variation): RedirectResponse
    {
        $this->authorize('reject', $variation);

        if ($variation->contract_id !== $contract->id) {
            return back()->with('error', __('contracts.variations.not_found'));
        }

        $validated = $request->validate([
            'decision_notes' => ['nullable', 'string'],
        ]);

        /** @var \App\Models\User $user */
        $user = $request->user();

        try {
            $variation = $this->variationService->rejectVariation(
                $variation,
                $user,
                $validated['decision_notes'] ?? null
            );
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        $this->activityLogger->log(
            'contracts.contract.variation_rejected',
            $contract,
            ['status' => ContractVariation::STATUS_SUBMITTED],
            [
                'variation_id' => (string) $variation->id,
                'variation_no' => $variation->variation_no,
                'status' => $variation->status,
            ],
            $user
        );

        return back()->with('success', __('contracts.variations.rejected'));
    }
}
