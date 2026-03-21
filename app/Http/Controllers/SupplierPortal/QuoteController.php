<?php

declare(strict_types=1);

namespace App\Http\Controllers\SupplierPortal;

use App\Application\Procurement\Services\SubmitRfqQuoteService;
use App\Http\Controllers\Controller;
use App\Models\Rfq;
use App\Models\RfqQuote;
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
            abort(403, __('suppliers.supplier_profile_not_found'));
        }

        $invited = RfqSupplier::where('rfq_id', $rfq->id)
            ->where('supplier_id', $supplier->id)
            ->whereNot('status', 'removed')
            ->exists();
        if (! $invited) {
            abort(403, __('supplier_portal.rfq_not_invited'));
        }

        $acceptingStatuses = [
            Rfq::STATUS_ISSUED,
            Rfq::STATUS_SUPPLIER_QUESTIONS,
            Rfq::STATUS_RESPONSES_RECEIVED,
        ];
        if (! in_array($rfq->status, $acceptingStatuses, true)) {
            return back()->withErrors([
                'items' => __('rfqs.rfq_no_longer_accepting_quotes'),
            ]);
        }

        $existingQuote = RfqQuote::query()
            ->where('rfq_id', $rfq->id)
            ->where('supplier_id', $supplier->id)
            ->first();

        $terminalStatuses = [
            Rfq::STATUS_CLOSED,
            Rfq::STATUS_CANCELLED,
            Rfq::STATUS_AWARDED,
            Rfq::STATUS_UNDER_EVALUATION,
            Rfq::STATUS_RECOMMENDED,
        ];
        if ($existingQuote !== null && in_array($rfq->status, $terminalStatuses, true)) {
            return back()->withErrors([
                'items' => __('rfqs.rfq_no_longer_accepting_quotes'),
            ]);
        }

        $rfq->load('items');
        $itemIds = $rfq->items->pluck('id')->all();

        $rules = [
            'items' => 'required|array',
        ];
        foreach ($itemIds as $id) {
            $rules["items.{$id}"] = 'required|array';
            $rules["items.{$id}.unit_price"] = 'required|numeric|min:0.01';
            $rules["items.{$id}.total_price"] = 'required|numeric|min:0.01';
            $rules["items.{$id}.notes"] = 'nullable|string|max:1000';
        }

        $validated = $request->validate($rules, [
            'items.*.unit_price.min' => __('rfqs.price_must_be_positive'),
            'items.*.total_price.min' => __('rfqs.price_must_be_positive'),
        ]);

        $wasUpdate = false;

        try {
            DB::transaction(function () use ($rfq, $supplier, $validated, $request, &$wasUpdate): void {
                $result = app(SubmitRfqQuoteService::class)->execute($rfq, [
                    'supplier_id' => $supplier->id,
                    'items' => $validated['items'],
                ]);
                $wasUpdate = $result['was_update'];
                $quote = $result['quote'];
                $totalAmount = (float) $quote->items->sum('total_price');
                app(\App\Services\Procurement\RfqQuoteService::class)->recordSubmission($rfq->fresh(), $supplier, $totalAmount, $request->user());
            });
        } catch (\RuntimeException $e) {
            return back()->withErrors(['items' => $e->getMessage()]);
        }

        $message = $wasUpdate
            ? __('supplier_portal.quote_updated_flash')
            : __('supplier_portal.quote_submitted_flash');

        return redirect()->route('supplier.rfqs.show', $rfq)
            ->with('success', $message);
    }
}
