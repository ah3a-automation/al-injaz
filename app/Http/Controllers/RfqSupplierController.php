<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Rfq;
use App\Models\RfqSupplier;
use App\Models\Supplier;
use App\Services\ActivityLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class RfqSupplierController extends Controller
{
    public function __construct(
        private readonly ActivityLogger $activityLogger,
    ) {}

    public function search(Request $request, Rfq $rfq): Response
    {
        $this->authorize('update', $rfq);

        $suppliers = Supplier::query()
            ->where('status', 'approved')
            ->where('is_verified', true)
            ->whereNotIn('id', $rfq->suppliers()->pluck('supplier_id'))
            ->when($request->input('search'), fn ($q, $v) =>
                $q->where(fn ($q2) =>
                    $q2->where('legal_name_en', 'ilike', "%{$v}%")
                       ->orWhere('supplier_code', 'ilike', "%{$v}%")
                       ->orWhere('trade_name', 'ilike', "%{$v}%")
                )
            )
            ->when($request->input('supplier_type'),       fn ($q, $v) => $q->where('supplier_type', $v))
            ->when($request->input('city'),                fn ($q, $v) => $q->where('city', $v))
            ->when($request->input('country'),             fn ($q, $v) => $q->where('country', $v))
            ->when($request->input('classification_grade'), fn ($q, $v) => $q->where('classification_grade', $v))
            ->orderBy('legal_name_en')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Rfqs/InviteSuppliers', [
            'rfq'       => $rfq->only('id', 'rfq_number', 'title', 'status'),
            'suppliers' => $suppliers,
            'invited'   => $rfq->suppliers()->with('supplier:id,legal_name_en,supplier_code')->get(),
            'filters'   => $request->only('search', 'supplier_type', 'city', 'country', 'classification_grade'),
        ]);
    }

    public function invite(Request $request, Rfq $rfq): RedirectResponse
    {
        $this->authorize('update', $rfq);

        $validated = $request->validate([
            'supplier_ids'   => 'required|array|min:1',
            'supplier_ids.*' => 'uuid|exists:suppliers,id',
        ]);

        $invited = 0;
        foreach ($validated['supplier_ids'] as $supplierId) {
            $already = RfqSupplier::where('rfq_id', $rfq->id)
                ->where('supplier_id', $supplierId)
                ->exists();

            if (!$already) {
                RfqSupplier::create([
                    'rfq_id'      => $rfq->id,
                    'supplier_id' => $supplierId,
                    'invited_by'  => $request->user()->id,
                    'status'      => 'invited',
                ]);
                $invited++;
            }
        }

        $this->activityLogger->log('rfq.suppliers_invited', $rfq, [], [], $request->user());

        return back()->with('success', "{$invited} supplier(s) invited.");
    }

    public function remove(Request $request, Rfq $rfq, RfqSupplier $rfqSupplier): RedirectResponse
    {
        $this->authorize('update', $rfq);

        if ($rfqSupplier->rfq_id !== $rfq->id) {
            abort(404);
        }

        if ($rfqSupplier->status === 'submitted') {
            return back()->withErrors(['supplier' => 'Cannot remove a supplier who has already submitted a quote.']);
        }

        $this->activityLogger->log('rfq.supplier_removed', $rfq, [], [], $request->user());

        $rfqSupplier->delete();

        return back()->with('success', 'Supplier removed from RFQ.');
    }
}
