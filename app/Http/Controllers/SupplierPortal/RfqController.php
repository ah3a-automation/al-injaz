<?php

declare(strict_types=1);

namespace App\Http\Controllers\SupplierPortal;

use App\Application\Procurement\Services\RfqQuoteLineResolver;
use App\Http\Controllers\Controller;
use App\Models\ProcurementPackageAttachment;
use App\Models\Rfq;
use App\Models\RfqClarification;
use App\Models\RfqDocument;
use App\Models\RfqQuote;
use App\Models\RfqSupplier;
use App\Models\RfqSupplierInvitation;
use App\Models\RfqSupplierQuote;
use App\Models\RfqSupplierQuoteSnapshot;
use App\Services\Procurement\SupplierRfqActivityLogger;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

final class RfqController extends Controller
{
    private const PACKAGE_ATTACHMENT_MIME_TO_EXT = [
        'application/pdf' => 'pdf',
        'application/msword' => 'doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' => 'docx',
        'application/vnd.ms-excel' => 'xls',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' => 'xlsx',
        'image/png' => 'png',
        'image/jpeg' => 'jpg',
        'image/jpg' => 'jpg',
    ];

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
            abort(403, __('supplier_portal.rfq_not_invited'));
        }
    }

    /**
     * RFQs visible to suppliers after invitation (exclude pre-issue internal states).
     *
     * @return array<int, string>
     */
    private function openStatusesForSupplier(): array
    {
        return [
            Rfq::STATUS_ISSUED,
            Rfq::STATUS_SUPPLIER_QUESTIONS,
            Rfq::STATUS_RESPONSES_RECEIVED,
            Rfq::STATUS_UNDER_EVALUATION,
            Rfq::STATUS_RECOMMENDED,
        ];
    }

    /**
     * @return array{accepting: array<int, string>, terminal: array<int, string>}
     */
    private function quotePhaseStatuses(): array
    {
        return [
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
    }

    private function submissionDeadlinePassed(Rfq $rfq): bool
    {
        if ($rfq->submission_deadline === null) {
            return false;
        }

        return Carbon::parse($rfq->submission_deadline)->endOfDay()->isPast();
    }

    private function canSupplierSubmitQuote(Rfq $rfq, ?RfqQuote $myQuote): bool
    {
        if ($this->submissionDeadlinePassed($rfq)) {
            return false;
        }

        $phases = $this->quotePhaseStatuses();
        if (! in_array($rfq->status, $phases['accepting'], true)) {
            return false;
        }
        if ($myQuote !== null && in_array($rfq->status, $phases['terminal'], true)) {
            return false;
        }

        return true;
    }

    private function canSupplierAskClarification(Rfq $rfq): bool
    {
        return in_array($rfq->status, [
            Rfq::STATUS_ISSUED,
            Rfq::STATUS_SUPPLIER_QUESTIONS,
            Rfq::STATUS_RESPONSES_RECEIVED,
        ], true);
    }

    /**
     * Clarifications visible to this supplier (public + own private).
     *
     * @return EloquentCollection<int, RfqClarification>
     */
    private function visibleClarificationsForSupplier(Rfq $rfq, string $supplierId): EloquentCollection
    {
        return $rfq->clarifications()
            ->with(['supplier:id,legal_name_en'])
            ->where(function ($q) use ($supplierId): void {
                $q->where('visibility', RfqClarification::VISIBILITY_PUBLIC)
                    ->orWhere(function ($q2) use ($supplierId): void {
                        $q2->where('visibility', RfqClarification::VISIBILITY_PRIVATE)
                            ->where('supplier_id', $supplierId);
                    });
            })
            ->orderBy('created_at', 'asc')
            ->get();
    }

    public function index(Request $request): Response
    {
        $supplierId = $this->getSupplierId($request);

        $rfqIds = RfqSupplier::where('supplier_id', $supplierId)
            ->whereNot('status', 'removed')
            ->pluck('rfq_id');

        $openStatuses = $this->openStatusesForSupplier();
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

        $shouldLogFirstSupplierView = false;
        if ($invitation === null) {
            RfqSupplierInvitation::create([
                'rfq_id' => $rfq->id,
                'supplier_id' => $supplierId,
                'invited_at' => now(),
                'viewed_at' => now(),
                'status' => RfqSupplierInvitation::STATUS_VIEWED,
            ]);
            $invitation = RfqSupplierInvitation::query()
                ->where('rfq_id', $rfq->id)
                ->where('supplier_id', $supplierId)
                ->first();
            $shouldLogFirstSupplierView = true;
        } elseif ($invitation->viewed_at === null) {
            $invitation->update([
                'viewed_at' => now(),
                'status' => RfqSupplierInvitation::STATUS_VIEWED,
            ]);
            $shouldLogFirstSupplierView = true;
        }

        if ($shouldLogFirstSupplierView) {
            app(SupplierRfqActivityLogger::class)->logRfqFirstViewed($rfq, $supplierId, $request->user(), $request);
        }

        $rfq->load([
            'project:id,name,name_en,code',
            'procurementPackage:id,package_no,name,project_id',
            'procurementPackage.attachments.uploadedByUser:id,name',
            'items' => fn ($q) => $q->orderBy('sort_order'),
            'documents.uploadedBy:id,name',
            'award',
        ]);

        $rfqSupplier = RfqSupplier::where('rfq_id', $rfq->id)
            ->where('supplier_id', $supplierId)
            ->first();

        $myQuote = $rfq->rfqQuotes()
            ->where('supplier_id', $supplierId)
            ->with('items')
            ->first();

        if ($myQuote !== null) {
            $myQuote->load('media');
        }

        $tracker = RfqSupplierQuote::query()
            ->where('rfq_id', $rfq->id)
            ->where('supplier_id', $supplierId)
            ->with(['snapshots.media'])
            ->first();

        $visibleClarifications = $this->visibleClarificationsForSupplier($rfq, $supplierId);

        $clarificationsPayload = $visibleClarifications->map(static function (RfqClarification $c): array {
            return [
                'id' => $c->id,
                'question' => $c->question,
                'answer' => $c->answer,
                'status' => $c->status,
                'visibility' => $c->visibility,
                'supplier' => $c->supplier ? [
                    'id' => $c->supplier->id,
                    'legal_name_en' => $c->supplier->legal_name_en,
                ] : null,
                'created_at' => $c->created_at?->toIso8601String(),
                'answered_at' => $c->answered_at?->toIso8601String(),
            ];
        })->values();

        $rfqDocumentsPayload = $rfq->documents->map(function (RfqDocument $d) use ($rfq): array {
            return [
                'id' => $d->id,
                'title' => $d->title,
                'document_type' => $d->document_type,
                'version' => $d->version ?? 1,
                'uploaded_at' => $d->created_at?->toIso8601String(),
                'uploaded_by' => $d->uploadedBy?->name,
                'download_url' => $d->external_url
                    ? $d->external_url
                    : ($d->file_path ? route('supplier.rfqs.buyer-documents.download', ['rfq' => $rfq->id, 'document' => $d->id]) : null),
                'is_external' => $d->external_url !== null,
            ];
        })->values()->all();

        $packageAttachments = $rfq->procurementPackage
            ? $rfq->procurementPackage->attachments->map(function (ProcurementPackageAttachment $a) use ($rfq): array {
                return [
                    'id' => $a->id,
                    'title' => $a->title,
                    'source_type' => $a->source_type,
                    'document_type' => $a->document_type,
                    'version' => $a->version ?? 1,
                    'uploaded_at' => $a->created_at?->toIso8601String(),
                    'uploaded_by' => $a->uploadedByUser?->name,
                    'external_url' => $a->external_url,
                    'download_url' => $a->external_url
                        ? $a->external_url
                        : ($a->file_path ? route('supplier.rfqs.package-attachments.download', ['rfq' => $rfq->id, 'attachment' => $a->id]) : null),
                    'is_external' => $a->external_url !== null,
                ];
            })->values()->all()
            : [];

        $draftQuoteAttachments = [];
        if ($myQuote !== null) {
            foreach ($myQuote->getMedia('attachments') as $m) {
                $draftQuoteAttachments[] = [
                    'id' => $m->id,
                    'name' => $m->name,
                    'file_name' => $m->file_name,
                    'size' => $m->size,
                    'mime_type' => $m->mime_type,
                    'created_at' => $m->created_at?->toIso8601String(),
                    'download_url' => route('media.download', ['media' => $m->id]),
                ];
            }
        }

        $submittedVersionSnapshots = [];
        if ($tracker !== null) {
            /** @var RfqSupplierQuoteSnapshot $snap */
            foreach ($tracker->snapshots as $snap) {
                $att = [];
                foreach ($snap->getMedia('attachments') as $m) {
                    $att[] = [
                        'id' => $m->id,
                        'name' => $m->name,
                        'file_name' => $m->file_name,
                        'size' => $m->size,
                        'mime_type' => $m->mime_type,
                        'created_at' => $m->created_at?->toIso8601String(),
                        'download_url' => route('media.download', ['media' => $m->id]),
                    ];
                }
                $submittedVersionSnapshots[] = [
                    'revision_no' => $snap->revision_no,
                    'submitted_at' => $snap->submitted_at?->toIso8601String(),
                    'item_count' => isset($snap->snapshot_data['items']) && is_array($snap->snapshot_data['items'])
                        ? count($snap->snapshot_data['items'])
                        : 0,
                    'attachments' => $att,
                ];
            }
        }

        $awardPayload = null;
        if ($rfq->award !== null) {
            $awardPayload = [
                'you_won' => $rfq->award->supplier_id === $supplierId,
                'awarded_amount' => $rfq->award->awarded_amount,
                'currency' => $rfq->award->currency ?? $rfq->currency,
                'awarded_at' => $rfq->award->awarded_at?->toIso8601String(),
                'award_note' => $rfq->award->award_note,
            ];
        }

        $canSubmitQuote = $this->canSupplierSubmitQuote($rfq, $myQuote);
        $canAskClarification = $this->canSupplierAskClarification($rfq);

        $daysRemaining = null;
        if ($rfq->submission_deadline !== null) {
            $deadlineDay = Carbon::parse($rfq->submission_deadline)->startOfDay();
            $daysRemaining = (int) now()->startOfDay()->diffInDays($deadlineDay, false);
        }

        $quoteStatus = 'not_started';
        if ($tracker === null) {
            if ($myQuote !== null && ($myQuote->status === RfqQuote::STATUS_DRAFT || $myQuote->draft_data !== null)) {
                $quoteStatus = 'draft_saved';
            }
        } elseif ($myQuote !== null && $myQuote->draft_data !== null) {
            $quoteStatus = 'draft_saved';
        } else {
            $quoteStatus = $tracker->revision_no <= 1 ? 'submitted_v1' : 'revised_v'.$tracker->revision_no;
        }

        $currentQuoteVersion = $tracker !== null ? (int) $tracker->revision_no : 0;

        $submissionState = 'locked';
        if ($canSubmitQuote) {
            $submissionState = $tracker !== null ? 'revision_allowed' : 'submission_open';
        }

        $draftItemsForSummary = null;
        if ($myQuote !== null && is_array($myQuote->draft_data['items'] ?? null)) {
            /** @var array<string, array{unit_price?: mixed, included_in_other?: mixed}> $draftItemsForSummary */
            $draftItemsForSummary = $myQuote->draft_data['items'];
        }

        $quoteSubmissionSummary = RfqQuoteLineResolver::summarize(
            $rfq->items,
            $draftItemsForSummary,
            $myQuote?->items
        );

        $chunkThreshold = (int) config('supplier_portal.rfq_quote_items.chunk_threshold', 50);
        $chunkSize = (int) config('supplier_portal.rfq_quote_items.chunk_size', 25);
        $itemCount = $rfq->items->count();

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
                'draft_saved_at' => $myQuote->draft_saved_at?->toIso8601String(),
                'draft_data' => $myQuote->draft_data,
                'items' => $myQuote->items->map(fn ($i) => [
                    'rfq_item_id' => $i->rfq_item_id,
                    'unit_price' => $i->unit_price,
                    'total_price' => $i->total_price,
                    'notes' => $i->notes,
                    'included_in_other' => (bool) $i->included_in_other,
                ])->values()->all(),
            ] : null,
            'package_attachments' => $packageAttachments,
            'rfq_documents' => $rfqDocumentsPayload,
            'supplier_quote_attachments' => $draftQuoteAttachments,
            'draft_quote_attachments' => $draftQuoteAttachments,
            'submitted_version_snapshots' => $submittedVersionSnapshots,
            'clarifications' => $clarificationsPayload,
            'award' => $awardPayload,
            'can_submit_quote' => $canSubmitQuote,
            'can_ask_clarification' => $canAskClarification,
            'days_remaining' => $daysRemaining,
            'quote_status' => $quoteStatus,
            'current_quote_version' => $currentQuoteVersion,
            'last_submitted_at' => $tracker?->submitted_at?->toIso8601String(),
            'submission_state' => $submissionState,
            'can_delete_quote_attachments' => $tracker === null,
            'quote_submission_summary' => $quoteSubmissionSummary,
            'quote_items_chunking_active' => $itemCount > $chunkThreshold,
            'quote_items_chunk_threshold' => $chunkThreshold,
            'quote_items_chunk_size' => $chunkSize,
        ]);
    }

    public function downloadDocument(Request $request, Rfq $rfq, RfqDocument $document): StreamedResponse|\Illuminate\Http\RedirectResponse
    {
        $this->ensureInvited($request, $rfq);
        if ($document->rfq_id !== $rfq->id) {
            abort(404);
        }

        if ($document->external_url) {
            return redirect()->away($document->external_url);
        }

        if (! $document->file_path) {
            abort(404, 'Document file not found.');
        }

        $disk = 'local';

        if (! Storage::disk($disk)->exists($document->file_path)) {
            abort(404, 'Document file not found.');
        }

        $inline = $request->boolean('inline');

        $base = $document->title !== ''
            ? (string) preg_replace('/[^A-Za-z0-9._-]+/', '_', $document->title)
            : (pathinfo($document->file_path, PATHINFO_FILENAME) ?: 'document');

        $ext = pathinfo($document->file_path, PATHINFO_EXTENSION);
        if ($ext === '') {
            $ext = 'bin';
        }

        if (! str_ends_with(strtolower($base), '.' . strtolower($ext))) {
            $filename = $base . '.' . $ext;
        } else {
            $filename = $base;
        }

        if ($inline) {
            $mimeType = $document->mime_type ?: Storage::disk($disk)->mimeType($document->file_path);
            $stream = Storage::disk($disk)->readStream($document->file_path);
            if ($stream === null) {
                abort(404, 'Document file not found.');
            }

            return new StreamedResponse(function () use ($stream): void {
                if (is_resource($stream)) {
                    fpassthru($stream);
                    fclose($stream);
                }
            }, 200, [
                'Content-Type' => $mimeType ?: 'application/octet-stream',
                'Content-Disposition' => 'inline; filename="' . addslashes($filename) . '"',
            ]);
        }

        return Storage::disk($disk)->download($document->file_path, $filename);
    }

    public function downloadPackageAttachment(Request $request, Rfq $rfq, ProcurementPackageAttachment $attachment): StreamedResponse|\Illuminate\Http\RedirectResponse
    {
        $this->ensureInvited($request, $rfq);
        if ((string) $rfq->procurement_package_id !== (string) $attachment->package_id) {
            abort(404);
        }

        if ($attachment->external_url) {
            return redirect()->away($attachment->external_url);
        }

        if (! $attachment->file_path) {
            abort(404, 'Attachment file not found.');
        }

        $diskCandidates = array_unique([
            (string) config('filesystems.default', 'local'),
            'local',
        ]);

        $inline = $request->boolean('inline');

        foreach ($diskCandidates as $disk) {
            if (Storage::disk($disk)->exists($attachment->file_path)) {
                $filename = $this->packageAttachmentFilename($attachment, $disk);
                $mimeType = $attachment->mime_type ?: Storage::disk($disk)->mimeType($attachment->file_path);
                $disposition = $inline ? 'inline' : 'attachment';
                $dispositionHeader = $disposition . '; filename="' . addslashes($filename) . '"';

                if ($inline) {
                    $stream = Storage::disk($disk)->readStream($attachment->file_path);
                    if ($stream === null) {
                        continue;
                    }

                    return new StreamedResponse(function () use ($stream): void {
                        if (is_resource($stream)) {
                            fpassthru($stream);
                            fclose($stream);
                        }
                    }, 200, [
                        'Content-Type' => $mimeType ?: 'application/octet-stream',
                        'Content-Disposition' => $dispositionHeader,
                    ]);
                }

                return Storage::disk($disk)->download($attachment->file_path, $filename);
            }
        }

        abort(404, 'Attachment file not found.');
    }

    private function packageAttachmentFilename(ProcurementPackageAttachment $attachment, string $disk): string
    {
        $base = $attachment->title !== ''
            ? (string) preg_replace('/[^A-Za-z0-9._-]+/', '_', $attachment->title)
            : (pathinfo($attachment->file_path, PATHINFO_FILENAME) ?: 'attachment');
        $ext = null;
        if ($attachment->mime_type && isset(self::PACKAGE_ATTACHMENT_MIME_TO_EXT[$attachment->mime_type])) {
            $ext = self::PACKAGE_ATTACHMENT_MIME_TO_EXT[$attachment->mime_type];
        }
        if ($ext === null) {
            $storedExt = pathinfo($attachment->file_path, PATHINFO_EXTENSION);
            if ($storedExt !== '') {
                $ext = $storedExt;
            } else {
                $ext = 'bin';
            }
        }
        if (str_ends_with(strtolower($base), '.' . $ext)) {
            return $base;
        }

        return $base . '.' . $ext;
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
        $supplierId = $this->getSupplierId($request);

        $visible = $this->visibleClarificationsForSupplier($rfq, $supplierId);
        $visible->load(['supplier:id,legal_name_en', 'askedBy:id,name', 'answeredBy:id,name']);

        return response()->json([
            'clarifications' => $visible->map(fn ($c) => [
                'id' => $c->id,
                'question' => $c->question,
                'answer' => $c->answer,
                'visibility' => $c->visibility,
                'asked_by' => $c->askedBy?->name,
                'answered_by' => $c->answeredBy?->name,
            ])->values()->all(),
        ]);
    }

}
