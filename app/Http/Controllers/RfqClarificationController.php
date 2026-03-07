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
            'visibility'  => 'required|string|in:private_supplier,broadcast_all',
        ]);

        RfqClarification::create([
            'rfq_id'      => $rfq->id,
            'question'    => $validated['question'],
            'supplier_id' => $validated['supplier_id'] ?? null,
            'visibility'  => $validated['visibility'],
            'asked_by'    => $request->user()->id,
        ]);

        $this->activityLogger->log('rfq.clarification_added', $rfq, [], [], $request->user());

        return back()->with('success', 'Clarification question added.');
    }

    public function answer(Request $request, Rfq $rfq, RfqClarification $clarification): RedirectResponse
    {
        $this->authorize('issue', $rfq);

        if ($clarification->rfq_id !== $rfq->id) {
            abort(404);
        }

        $validated = $request->validate([
            'answer'     => 'required|string',
            'visibility' => 'required|string|in:private_supplier,broadcast_all',
        ]);

        DB::table('rfq_clarifications')
            ->where('id', $clarification->id)
            ->update([
                'answer'      => $validated['answer'],
                'visibility'  => $validated['visibility'],
                'answered_by' => $request->user()->id,
                'answered_at' => now(),
            ]);

        $this->activityLogger->log('rfq.clarification_answered', $rfq, [], [], $request->user());

        return back()->with('success', 'Clarification answered.');
    }
}
