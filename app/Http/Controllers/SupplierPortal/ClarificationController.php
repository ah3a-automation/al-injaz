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
            abort(403, __('suppliers.supplier_profile_not_found'));
        }

        $invited = RfqSupplier::where('rfq_id', $rfq->id)
            ->where('supplier_id', $supplier->id)
            ->whereNot('status', 'removed')
            ->exists();
        if (! $invited) {
            abort(403, __('supplier_portal.rfq_not_invited'));
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

        return back()->with('success', __('supplier_portal.clarification_submitted_flash'));
    }
}
