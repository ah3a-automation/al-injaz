<?php

declare(strict_types=1);

namespace App\Http\Controllers\SupplierPortal;

use App\Http\Controllers\Controller;
use App\Models\Rfq;
use App\Models\RfqSupplier;
use App\Services\Procurement\RfqClarificationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

final class ClarificationController extends Controller
{
    public function store(Request $request, Rfq $rfq): RedirectResponse
    {
        $supplier = $request->user()->supplierProfile;
        if (! $supplier) {
            abort(403, 'Supplier profile not found.');
        }

        $invited = RfqSupplier::where('rfq_id', $rfq->id)
            ->where('supplier_id', $supplier->id)
            ->whereNot('status', 'removed')
            ->exists();
        if (! $invited) {
            abort(403, 'You are not invited to this RFQ.');
        }

        $validated = $request->validate([
            'question' => 'required|string|max:2000',
        ]);

        app(RfqClarificationService::class)->createQuestion(
            $rfq,
            $validated['question'],
            $supplier,
            $request->user()
        );

        return back()->with('success', 'Clarification question submitted.');
    }
}
