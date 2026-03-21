<?php

declare(strict_types=1);

namespace App\Http\Controllers\SupplierPortal;

use App\Application\Procurement\Services\SubmitRfqQuoteService;
use App\Http\Controllers\Controller;
use App\Models\Rfq;
use App\Models\RfqClarification;
use App\Models\RfqSupplier;
use App\Models\RfqSupplierInvitation;
use App\Services\Procurement\RfqClarificationService;
use App\Services\Procurement\RfqQuoteService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

final class RfqController extends Controller
{
    private function getSupplierId(Request $request): string
    {
        $supplier = $request->user()->supplierProfile;
        if (! $supplier) {
            abort(403, __('suppliers.supplier_profile_not_found'));
        }
        return $supplier->id;
    }

    private function ensureInvited(Request $request, Rfq $rfq): void
    {
        $supplierId = $this->getSupplierId($request);
        $invited = RfqSupplier::where('rfq_id', $rfq->id)
            ->where('supplier_id', $supplierId)
            ->whereNot('status', 'removed')
            ->exists();
        if (! $invited) {
            abort(403, 'You are not invited to this RFQ.');
        }
    }

    public function index(Request $request): Response
    {
        $supplierId = $this->getSupplierId($request);

        $rfqIds = RfqSupplier::where('supplier_id', $supplierId)
            ->whereNot('status', 'removed')
            ->pluck('rfq_id');

        $openStatuses = ['draft', 'internally_approved', 'issued', 'supplier_questions_open', 'responses_received', 'under_evaluation', 'recommended'];
        $closedStatuses = ['awarded', 'closed', 'cancelled'];

        $tab = $request->string('tab', 'open')->toString();
        if ($tab === 'closed') {
            $query = Rfq::query()
                ->whereIn('id', $rfqIds)
                ->whereIn('status', $closedStatuses);
        } else {
            $query = Rfq::query()
                ->whereIn('id', $rfqIds)
                ->whereIn('status', $openStatuses);
        }

        $query->with([
                'project:id,name,name_en',
                'procurementPackage:id,package_no,name',
            ])
            ->withCount(['suppliers', 'rfqQuotes'])
            ->orderByDesc('created_at');

        $perPage = $request->integer('per_page', 25);
        $paginator = $query->cursorPaginate($perPage)->withQueryString();

        $rfqsPayload = [
            'data' => $paginator->items(),
            'path' => $paginator->path(),
            'per_page' => $paginator->perPage(),
            'next_cursor' => $paginator->nextCursor()?->encode(),
            'prev_cursor' => $paginator->previousCursor()?->encode(),
        ];

        return Inertia::render('SupplierPortal/Rfqs/Index', [
            'rfqs' => $rfqsPayload,
            'tab' => $tab,
        ]);
    }

    public function show(Request $request, Rfq $rfq): Response
    {
        $this->ensureInvited($request, $rfq);
        $supplierId = $this->getSupplierId($request);

        $invitation = RfqSupplierInvitation::query()
            ->where('rfq_id', $rfq->id)
            ->where('supplier_id', $supplierId)
            ->first();

        if ($invitation === null) {
            RfqSupplierInvitation::create([
                'rfq_id' => $rfq->id,
                'supplier_id' => $supplierId,
                'invited_at' => now(),
                'viewed_at' => now(),
                'status' => RfqSupplierInvitation::STATUS_VIEWED,
            ]);
        } elseif ($invitation->viewed_at === null) {
            $invitation->update([
                'viewed_at' => now(),
                'status' => RfqSupplierInvitation::STATUS_VIEWED,
            ]);
        }

        $rfq->load([
            'project:id,name,name_en,code',
            'procurementPackage:id,package_no,name,project_id',
            'procurementPackage.attachments',
            'items' => fn ($q) => $q->orderBy('sort_order'),
            'documents',
        ]);

        $rfqSupplier = RfqSupplier::where('rfq_id', $rfq->id)
            ->where('supplier_id', $supplierId)
            ->first();

        $myQuote = $rfq->rfqQuotes()
            ->where('supplier_id', $supplierId)
            ->with('items')
            ->first();

        $visibleClarifications = $rfq->clarifications()
            ->where(function ($q) use ($supplierId) {
                $q->where('visibility', RfqClarification::VISIBILITY_PUBLIC)
                    ->orWhere(function ($q2) use ($supplierId) {
                        $q2->where('visibility', RfqClarification::VISIBILITY_PRIVATE)
                            ->where('supplier_id', $supplierId);
                    });
            })
            ->orderBy('created_at', 'asc')
            ->get();

        $clarificationsPayload = $visibleClarifications->map(static function (RfqClarification $c): array {
            return [
                'id'          => $c->id,
                'question'    => $c->question,
                'answer'      => $c->answer,
                'status'      => $c->status,
                'visibility'  => $c->visibility,
                'supplier'    => $c->supplier ? [
                    'id'            => $c->supplier->id,
                    'legal_name_en' => $c->supplier->legal_name_en,
                ] : null,
                'created_at'  => $c->created_at?->toIso8601String(),
                'answered_at' => $c->answered_at?->toIso8601String(),
            ];
        })->values();

        $timeline = collect();

        if ($invitation !== null && $invitation->invited_at !== null) {
            $timeline->push([
                'type'      => 'invitation',
                'title'     => __('supplier_portal.timeline_invited'),
                'timestamp' => $invitation->invited_at->toIso8601String(),
            ]);
        }

        foreach ($visibleClarifications as $clarification) {
            $timeline->push([
                'type'      => 'clarification',
                'title'     => __('supplier_portal.timeline_clarification_added'),
                'timestamp' => $clarification->created_at?->toIso8601String(),
            ]);

            if ($clarification->answered_at !== null) {
                $timeline->push([
                    'type'      => 'clarification_answered',
                    'title'     => __('supplier_portal.timeline_clarification_answered'),
                    'timestamp' => $clarification->answered_at->toIso8601String(),
                ]);
            }
        }

        if ($myQuote !== null && $myQuote->submitted_at !== null) {
            $timeline->push([
                'type'      => 'quote_submitted',
                'title'     => __('supplier_portal.timeline_quote_submitted'),
                'timestamp' => $myQuote->submitted_at->toIso8601String(),
            ]);
        }

        $timelinePayload = $timeline
            ->filter(static fn (array $event): bool => $event['timestamp'] !== null)
            ->sortBy('timestamp')
            ->values()
            ->all();

        $packageAttachments = $rfq->procurementPackage
            ? $rfq->procurementPackage->attachments->map(fn ($a) => [
                'id' => $a->id,
                'title' => $a->title,
                'source_type' => $a->source_type,
                'document_type' => $a->document_type,
                'external_url' => $a->external_url,
            ])->values()->all()
            : [];

        return Inertia::render('SupplierPortal/Rfqs/Show', [
            'rfq' => $rfq,
            'rfqSupplier' => $rfqSupplier ? [
                'id' => $rfqSupplier->id,
                'status' => $rfqSupplier->status,
                'invited_at' => $rfqSupplier->invited_at?->toIso8601String(),
                'quote_submitted' => $myQuote !== null && $myQuote->submitted_at !== null,
            ] : null,
            'myQuote' => $myQuote ? [
                'id' => $myQuote->id,
                'status' => $myQuote->status,
                'submitted_at' => $myQuote->submitted_at?->toIso8601String(),
                'items' => $myQuote->items->map(fn ($i) => [
                    'rfq_item_id' => $i->rfq_item_id,
                    'unit_price' => $i->unit_price,
                    'total_price' => $i->total_price,
                    'notes' => $i->notes,
                ])->values()->all(),
            ] : null,
            'package_attachments' => $packageAttachments,
            'clarifications' => $clarificationsPayload,
            'timeline' => $timelinePayload,
        ]);
    }

    public function documents(Request $request, Rfq $rfq): JsonResponse
    {
        $this->ensureInvited($request, $rfq);

        $rfq->load('documents');

        $documents = $rfq->documents->map(fn ($d) => [
            'id' => $d->id,
            'title' => $d->title,
            'document_type' => $d->document_type,
        ])->values()->all();

        return response()->json(['documents' => $documents]);
    }

    public function packageAttachments(Request $request, Rfq $rfq): JsonResponse
    {
        $this->ensureInvited($request, $rfq);

        $rfq->load('procurementPackage.attachments');

        $packageAttachments = $rfq->procurementPackage
            ? $rfq->procurementPackage->attachments->map(fn ($a) => [
                'id' => $a->id,
                'title' => $a->title,
                'source_type' => $a->source_type,
                'document_type' => $a->document_type,
                'external_url' => $a->external_url,
            ])->values()->all()
            : [];

        return response()->json(['package_attachments' => $packageAttachments]);
    }

    public function clarifications(Request $request, Rfq $rfq): JsonResponse
    {
        $this->ensureInvited($request, $rfq);

        $rfq->load(['clarifications.supplier:id,legal_name_en', 'clarifications.askedBy:id,name', 'clarifications.answeredBy:id,name']);

        return response()->json([
            'clarifications' => $rfq->clarifications->map(fn ($c) => [
                'id' => $c->id,
                'question' => $c->question,
                'answer' => $c->answer,
                'visibility' => $c->visibility,
                'asked_by' => $c->askedBy?->name,
                'answered_by' => $c->answeredBy?->name,
            ])->values()->all(),
        ]);
    }

    public function submitQuote(Request $request, Rfq $rfq): RedirectResponse
    {
        $this->ensureInvited($request, $rfq);
        $supplier = $request->user()->supplierProfile;
        if (! $supplier) {
            abort(403, __('suppliers.supplier_profile_not_found'));
        }

        $rfq->load('items');
        $itemIds = $rfq->items->pluck('id')->all();
        $rules = ['items' => 'required|array'];
        foreach ($itemIds as $id) {
            $rules["items.{$id}"] = 'required|array';
            $rules["items.{$id}.unit_price"] = 'required|numeric|min:0';
            $rules["items.{$id}.total_price"] = 'required|numeric|min:0';
            $rules["items.{$id}.notes"] = 'nullable|string|max:1000';
        }
        $validated = $request->validate($rules);

        try {
            $quote = app(SubmitRfqQuoteService::class)->execute($rfq, [
                'supplier_id' => $supplier->id,
                'items'       => $validated['items'],
            ]);
        } catch (\RuntimeException $e) {
            return back()->withErrors(['items' => $e->getMessage()]);
        }

        $quote->load('items');
        $totalAmount = (float) $quote->items->sum('total_price');
        app(RfqQuoteService::class)->recordSubmission($rfq, $supplier, $totalAmount, $request->user());

        return redirect()->route('supplier.rfqs.show', $rfq)->with('success', __('supplier_portal.quote_submitted_flash'));
    }

    public function createClarification(Request $request, Rfq $rfq): RedirectResponse
    {
        $this->ensureInvited($request, $rfq);
        $supplier = $request->user()->supplierProfile;

        $validated = $request->validate(['question' => 'required|string|max:2000']);

        app(RfqClarificationService::class)->createQuestion(
            $rfq,
            $validated['question'],
            $supplier ?: null,
            $request->user()
        );

        return back()->with('success', __('supplier_portal.clarification_submitted_flash'));
    }
}
