<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Rfq;
use App\Models\RfqClarification;
use App\Services\ActivityLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RfqClarificationController extends Controller
{
    public function __construct(
        private readonly ActivityLogger $activityLogger,
    ) {}

    public function store(Request $request, Rfq $rfq): RedirectResponse
    {
        $this->authorize('update', $rfq);

        $validated = $request->validate([
            'question'    => 'required|string',
            'supplier_id' => 'nullable|uuid|exists:suppliers,id',
            'visibility'  => 'required|string|in:private,public,private_supplier,broadcast_all',
        ]);

        $visibility = $this->normalizeVisibility($validated['visibility']);

        $clarification = RfqClarification::create([
            'rfq_id'      => $rfq->id,
            'question'    => $validated['question'],
            'supplier_id' => $validated['supplier_id'] ?? null,
            'visibility'  => $visibility,
            'status'      => RfqClarification::STATUS_OPEN,
            'asked_by'    => $request->user()->id,
        ]);

        $this->activityLogger->log('rfq.clarification_added', $rfq, [], [], $request->user());

        app(\App\Services\Procurement\RfqEventService::class)->clarificationAdded($clarification);

        return back()->with('success', 'Clarification question added.');
    }

    public function answer(Request $request, Rfq $rfq, RfqClarification $clarification): RedirectResponse
    {
        $this->authorize('view', $rfq);
        if (! $request->user()->can('rfq.evaluate')) {
            abort(403);
        }

        if ($clarification->rfq_id !== $rfq->id) {
            abort(404);
        }

        $validated = $request->validate([
            'answer'     => 'required|string',
            'visibility' => 'required|string|in:private,public,private_supplier,broadcast_all',
        ]);

        $visibility = $this->normalizeVisibility($validated['visibility']);

        $wasPrivate = $clarification->visibility === RfqClarification::VISIBILITY_PRIVATE;

        DB::table('rfq_clarifications')
            ->where('id', $clarification->id)
            ->update([
                'answer'      => $validated['answer'],
                'visibility'  => $visibility,
                'status'      => RfqClarification::STATUS_ANSWERED,
                'answered_by' => $request->user()->id,
                'answered_at' => now(),
            ]);

        // Refresh the model so events/notifications see the latest state
        $clarification->refresh();

        $this->activityLogger->log('rfq.clarification_answered', $rfq, [], [], $request->user());

        // Notify supplier that their clarification was answered
        app(\App\Services\Procurement\RfqEventService::class)->clarificationAnswered($clarification);

        // If visibility changed from private → public, broadcast to all RFQ suppliers
        if ($wasPrivate && $clarification->visibility === RfqClarification::VISIBILITY_PUBLIC) {
            app(\App\Services\Procurement\RfqEventService::class)->clarificationMadePublic($clarification);
        }

        return back()->with('success', 'Clarification answered.');
    }

    public function updateVisibility(Request $request, Rfq $rfq, RfqClarification $clarification): RedirectResponse
    {
        $this->authorize('view', $rfq);
        if (! $request->user()->can('rfq.evaluate')) {
            abort(403);
        }

        if ($clarification->rfq_id !== $rfq->id) {
            abort(404);
        }

        $validated = $request->validate([
            'visibility' => 'required|string|in:private,public,private_supplier,broadcast_all',
        ]);

        $newVisibility = $this->normalizeVisibility($validated['visibility']);
        $wasPrivate = $clarification->visibility === RfqClarification::VISIBILITY_PRIVATE;

        if ($clarification->visibility === $newVisibility) {
            return back();
        }

        $clarification->visibility = $newVisibility;
        $clarification->save();

        $this->activityLogger->log('rfq.clarification_visibility_updated', $rfq, [
            'clarification_id' => $clarification->id,
            'from' => $wasPrivate ? RfqClarification::VISIBILITY_PRIVATE : $clarification->getOriginal('visibility'),
            'to' => $newVisibility,
        ], [], $request->user());

        if ($wasPrivate && $clarification->visibility === RfqClarification::VISIBILITY_PUBLIC) {
            app(\App\Services\Procurement\RfqEventService::class)->clarificationMadePublic($clarification);
        }

        return back()->with('success', 'Clarification visibility updated.');
    }

    private function normalizeVisibility(string $visibility): string
    {
        return match ($visibility) {
            'private_supplier' => RfqClarification::VISIBILITY_PRIVATE,
            'broadcast_all' => RfqClarification::VISIBILITY_PUBLIC,
            default => $visibility,
        };
    }
}
