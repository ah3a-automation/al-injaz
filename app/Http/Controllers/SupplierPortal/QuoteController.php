<?php

declare(strict_types=1);

namespace App\Http\Controllers\SupplierPortal;

use App\Application\Procurement\Services\SaveDraftRfqQuoteService;
use App\Application\Procurement\Services\SubmitRfqQuoteService;
use App\Http\Controllers\Controller;
use App\Models\Rfq;
use App\Models\RfqQuote;
use App\Models\RfqSupplier;
use App\Models\RfqSupplierQuote;
use App\Services\Procurement\RfqQuoteService;
use App\Services\Procurement\SupplierRfqActivityLogger;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

final class QuoteController extends Controller
{
    public function saveDraft(Request $request, Rfq $rfq): RedirectResponse
    {
        $supplier = $this->supplierOrAbort($request);
        $this->ensureInvited($rfq, $supplier->id);
        $this->assertAcceptingQuotes($rfq);
        if ($this->submissionDeadlinePassed($rfq)) {
            return back()->withErrors(['items' => __('supplier_portal.quote_submission_closed')]);
        }

        $rfq->load('items');
        $itemIds = $rfq->items->pluck('id')->all();

        $rules = [
            'items' => 'required|array',
        ];
        foreach ($itemIds as $id) {
            $rules["items.{$id}"] = 'nullable|array';
            $rules["items.{$id}.unit_price"] = 'nullable|numeric|min:0';
            $rules["items.{$id}.included_in_other"] = 'nullable|boolean';
            $rules["items.{$id}.notes"] = 'nullable|string|max:1000';
        }

        $validated = $request->validate($rules);

        try {
            DB::transaction(function () use ($rfq, $supplier, $validated, $request): void {
                app(SaveDraftRfqQuoteService::class)->execute($rfq, [
                    'supplier_id' => $supplier->id,
                    'items' => $validated['items'],
                ], $request->user());
            });
        } catch (\RuntimeException $e) {
            return back()->withErrors(['items' => $e->getMessage()]);
        }

        return redirect()->route('supplier.rfqs.show', $rfq)
            ->with('success', __('supplier_portal.quote_draft_saved_flash'));
    }

    public function store(Request $request, Rfq $rfq): RedirectResponse
    {
        return $this->submit($request, $rfq);
    }

    public function submit(Request $request, Rfq $rfq): RedirectResponse
    {
        $supplier = $this->supplierOrAbort($request);
        $this->ensureInvited($rfq, $supplier->id);

        if ($this->submissionDeadlinePassed($rfq)) {
            return back()->withErrors(['items' => __('supplier_portal.quote_submission_closed')]);
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
            $rules["items.{$id}.unit_price"] = 'nullable|numeric|min:0';
            $rules["items.{$id}.included_in_other"] = 'nullable|boolean';
            $rules["items.{$id}.notes"] = 'nullable|string|max:1000';
        }

        $validated = $request->validate($rules, [
            'items.*.unit_price.min' => __('rfqs.unit_price_negative'),
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
                $totalAmount = (float) $quote->items->sum(static function (\App\Models\RfqQuoteItem $i): float {
                    return $i->total_price !== null ? (float) $i->total_price : 0.0;
                });
                app(RfqQuoteService::class)->recordSubmission($rfq->fresh(), $supplier, $totalAmount, $request->user(), $quote);
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

    public function storeAttachment(Request $request, Rfq $rfq): RedirectResponse
    {
        $supplier = $this->supplierOrAbort($request);
        $this->ensureInvited($rfq, $supplier->id);

        if ($this->submissionDeadlinePassed($rfq)) {
            return back()->withErrors(['file' => __('supplier_portal.quote_attachments_locked')]);
        }

        if (! $this->canSupplierSubmitQuote($rfq, $supplier->id)) {
            return back()->withErrors(['file' => __('supplier_portal.quote_attachments_locked')]);
        }

        $request->validate([
            'file' => 'required|file|max:51200',
        ]);

        $quote = RfqQuote::query()
            ->where('rfq_id', $rfq->id)
            ->where('supplier_id', $supplier->id)
            ->first();

        if ($quote === null) {
            $quote = RfqQuote::create([
                'rfq_id' => $rfq->id,
                'supplier_id' => $supplier->id,
                'submitted_at' => null,
                'status' => RfqQuote::STATUS_DRAFT,
            ]);
        }

        $quote->addMediaFromRequest('file')->toMediaCollection('attachments');

        $uploaded = $quote->getMedia('attachments')->sortByDesc('id')->first();
        $fileName = $uploaded !== null ? (string) $uploaded->file_name : 'unknown';
        $tracker = RfqSupplierQuote::query()
            ->where('rfq_id', $rfq->id)
            ->where('supplier_id', $supplier->id)
            ->first();
        $version = $tracker !== null ? (int) $tracker->revision_no : null;
        app(SupplierRfqActivityLogger::class)->logAttachmentUploaded(
            $rfq,
            $supplier->id,
            $fileName,
            $version,
            $request->user(),
            $request
        );

        return back()->with('success', __('supplier_portal.quote_attachment_uploaded_flash'));
    }

    public function destroyAttachment(Request $request, Rfq $rfq, int $media): RedirectResponse
    {
        $supplier = $this->supplierOrAbort($request);
        $this->ensureInvited($rfq, $supplier->id);

        $quote = RfqQuote::query()
            ->where('rfq_id', $rfq->id)
            ->where('supplier_id', $supplier->id)
            ->first();

        if ($quote === null) {
            abort(404);
        }

        $hadPriorSubmission = RfqSupplierQuote::query()
            ->where('rfq_id', $rfq->id)
            ->where('supplier_id', $supplier->id)
            ->exists();

        if ($hadPriorSubmission && $quote->status !== RfqQuote::STATUS_DRAFT) {
            return back()->withErrors(['file' => __('supplier_portal.quote_attachment_delete_locked')]);
        }

        $mediaModel = Media::query()
            ->where('id', $media)
            ->where('model_type', $quote->getMorphClass())
            ->where('model_id', $quote->id)
            ->where('collection_name', 'attachments')
            ->first();

        if ($mediaModel === null) {
            abort(404);
        }

        $fileName = (string) ($mediaModel->file_name ?? '');
        $tracker = RfqSupplierQuote::query()
            ->where('rfq_id', $rfq->id)
            ->where('supplier_id', $supplier->id)
            ->first();
        $version = $tracker !== null ? (int) $tracker->revision_no : null;
        app(SupplierRfqActivityLogger::class)->logAttachmentDeleted(
            $rfq,
            $supplier->id,
            $fileName,
            $version,
            $request->user(),
            $request
        );

        $mediaModel->delete();

        return back()->with('success', __('supplier_portal.quote_attachment_deleted_flash'));
    }

    private function submissionDeadlinePassed(Rfq $rfq): bool
    {
        if ($rfq->submission_deadline === null) {
            return false;
        }

        return Carbon::parse($rfq->submission_deadline)->endOfDay()->isPast();
    }

    private function supplierOrAbort(Request $request): \App\Models\Supplier
    {
        $supplier = $request->user()->supplierProfile;
        if (! $supplier) {
            abort(403, __('suppliers.supplier_profile_not_found'));
        }

        return $supplier;
    }

    private function ensureInvited(Rfq $rfq, string $supplierId): void
    {
        $invited = RfqSupplier::where('rfq_id', $rfq->id)
            ->where('supplier_id', $supplierId)
            ->whereNot('status', 'removed')
            ->exists();
        if (! $invited) {
            abort(403, __('supplier_portal.rfq_not_invited'));
        }
    }

    private function assertAcceptingQuotes(Rfq $rfq): void
    {
        $acceptingStatuses = [
            Rfq::STATUS_ISSUED,
            Rfq::STATUS_SUPPLIER_QUESTIONS,
            Rfq::STATUS_RESPONSES_RECEIVED,
        ];
        if (! in_array($rfq->status, $acceptingStatuses, true)) {
            abort(403, __('rfqs.rfq_no_longer_accepting_quotes'));
        }
    }

    private function canSupplierSubmitQuote(Rfq $rfq, string $supplierId): bool
    {
        if ($this->submissionDeadlinePassed($rfq)) {
            return false;
        }

        $phases = [
            'accepting' => [
                Rfq::STATUS_ISSUED,
                Rfq::STATUS_SUPPLIER_QUESTIONS,
                Rfq::STATUS_RESPONSES_RECEIVED,
            ],
            'terminal' => [
                Rfq::STATUS_CLOSED,
                Rfq::STATUS_CANCELLED,
                Rfq::STATUS_AWARDED,
                Rfq::STATUS_UNDER_EVALUATION,
                Rfq::STATUS_RECOMMENDED,
            ],
        ];

        $myQuote = RfqQuote::query()
            ->where('rfq_id', $rfq->id)
            ->where('supplier_id', $supplierId)
            ->first();

        if (! in_array($rfq->status, $phases['accepting'], true)) {
            return false;
        }
        if ($myQuote !== null && in_array($rfq->status, $phases['terminal'], true)) {
            return false;
        }

        return true;
    }
}
