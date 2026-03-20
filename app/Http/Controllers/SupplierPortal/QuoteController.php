<?php

declare(strict_types=1);

namespace App\Http\Controllers\SupplierPortal;

use App\Application\Procurement\Services\SubmitRfqQuoteService;
use App\Http\Controllers\Controller;
use App\Models\Rfq;
use App\Models\RfqSupplier;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class QuoteController extends Controller
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

        $rfq->load('items');
        $itemIds = $rfq->items->pluck('id')->all();

        $rules = [
            'items' => 'required|array',
        ];
        foreach ($itemIds as $id) {
            $rules["items.{$id}"] = 'required|array';
            $rules["items.{$id}.unit_price"] = 'required|numeric|min:0';
            $rules["items.{$id}.total_price"] = 'required|numeric|min:0';
            $rules["items.{$id}.notes"] = 'nullable|string|max:1000';
        }

        $validated = $request->validate($rules);

        try {
            DB::transaction(function () use ($rfq, $supplier, $validated, $request): void {
                $quote = app(SubmitRfqQuoteService::class)->execute($rfq, [
                    'supplier_id' => $supplier->id,
                    'items' => $validated['items'],
                ]);
                $quote->load('items');
                $totalAmount = (float) $quote->items->sum('total_price');
                app(\App\Services\Procurement\RfqQuoteService::class)->recordSubmission($rfq, $supplier, $totalAmount, $request->user());
            });
        } catch (\RuntimeException $e) {
            return back()->withErrors(['items' => $e->getMessage()]);
        }

        return redirect()->route('supplier.rfqs.show', $rfq)
            ->with('success', 'Quote submitted successfully.');
    }
}
