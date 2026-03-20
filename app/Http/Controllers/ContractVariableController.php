<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Contract;
use App\Services\ActivityLogger;
use App\Services\Contracts\ContractDraftRenderingService;
use App\Services\Contracts\ContractVariableRegistry;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

final class ContractVariableController extends Controller
{
    public function __construct(
        private readonly ContractDraftRenderingService $renderingService,
        private readonly ActivityLogger $activityLogger,
    ) {
    }

    /**
     * Save/update manual overrides for a contract.
     *
     * @return RedirectResponse
     */
    public function saveOverrides(Request $request, Contract $contract): RedirectResponse
    {
        $this->authorize('update', $contract);

        $manualKeys = array_filter(
            array_keys(ContractVariableRegistry::getVariables()),
            static fn (string $k): bool => str_starts_with($k, 'manual.')
        );
        $manualKeys = array_values($manualKeys);

        $validated = $request->validate([
            'overrides' => ['required', 'array'],
            'overrides.*.variable_key' => [
                'required',
                'string',
                'max:255',
                Rule::in($manualKeys),
            ],
            'overrides.*.value_text' => ['nullable', 'string', 'max:65535'],
        ]);

        $user = $request->user();

        foreach ($validated['overrides'] as $item) {
            $key = $item['variable_key'];
            $existing = $contract->variableOverrides()->where('variable_key', $key)->first();
            $value = $item['value_text'] ?? null;
            if ($existing) {
                $existing->value_text = $value;
                $existing->updated_by_user_id = $user->id;
                $existing->save();
            } else {
                $contract->variableOverrides()->create([
                    'variable_key' => $key,
                    'value_text' => $value,
                    'created_by_user_id' => $user->id,
                    'updated_by_user_id' => $user->id,
                ]);
            }
        }

        $this->activityLogger->log('contracts.contract.variables_overrides_updated', $contract, [], [], $user);

        return back()->with('success', __('contracts.variables.overrides_saved'));
    }

    /**
     * Preview render: render all draft articles and return summary (and optionally re-persist).
     *
     * @return RedirectResponse
     */
    public function previewRender(Request $request, Contract $contract): RedirectResponse
    {
        $this->authorize('update', $contract);

        $this->renderingService->renderAll($contract);
        $unresolved = $this->renderingService->getUnresolvedKeysForContract($contract);

        $user = $request->user();
        $this->activityLogger->log('contracts.contract.render_preview_generated', $contract, [], [
            'unresolved_count' => count($unresolved),
        ], $user);

        return back()->with('success', __('contracts.variables.preview_generated'))->with('unresolved_count', count($unresolved));
    }
}
