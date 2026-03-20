<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Application\Procurement\Queries\BoqItemsForPackageCreateQuery;
use App\Models\ProcurementPackage;
use App\Models\ProcurementPackageAttachment;
use App\Models\Project;
use App\Models\ProjectBoqItem;
use App\Services\ActivityLogger;
use App\Services\FileMimeValidationService;
use App\Services\ProcurementNumberingService;
use App\Services\Procurement\PackageReadinessService;
use Illuminate\Validation\Rule;
use App\Support\DocumentRequirements;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Barryvdh\DomPDF\Facade\Pdf;
use App\Support\BrandingHelper;
use App\Support\TimelineBuilder;

class ProcurementPackageController extends Controller
{
    private const PACKAGE_ATTACHMENT_MIMES = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/png',
        'image/jpeg',
        'image/jpg',
    ];

    private const PACKAGE_ATTACHMENT_EXTENSIONS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'png', 'jpg', 'jpeg'];

    private const MIME_TO_EXTENSION = [
        'application/pdf'                                                                 => 'pdf',
        'application/msword'                                                              => 'doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'         => 'docx',
        'application/vnd.ms-excel'                                                         => 'xls',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'                => 'xlsx',
        'image/png'                                                                        => 'png',
        'image/jpeg'                                                                       => 'jpg',
        'image/jpg'                                                                        => 'jpg',
    ];

    public function __construct(
        private readonly ActivityLogger $activityLogger,
        private readonly ProcurementNumberingService $numberingService,
        private readonly BoqItemsForPackageCreateQuery $boqItemsQuery,
        private readonly FileMimeValidationService $mimeValidator,
    ) {}

    public function index(Request $request, Project $project): Response
    {
        $this->authorize('viewAny', [ProcurementPackage::class, $project]);

        $packages = $project->procurementPackages()
            ->withCount('boqItems')
            ->with('createdByUser:id,name')
            ->orderBy('created_at', 'desc')
            ->get([
                'id',
                'project_id',
                'package_no',
                'name',
                'description',
                'currency',
                'needed_by_date',
                'status',
                'estimated_revenue',
                'estimated_cost',
                'actual_cost',
                'approval_status',
                'created_at',
                'created_by',
            ]);

        return Inertia::render('Projects/ProcurementPackages/Index', [
            'project'  => $project->only('id', 'name', 'name_en', 'name_ar', 'code'),
            'packages' => $packages,
        ]);
    }

    public function create(Request $request, Project $project): Response
    {
        $this->authorize('create', [ProcurementPackage::class, $project]);

        $search = $request->query('search');
        $unit = $request->query('unit');
        $leadType = $request->query('lead_type');
        $unusedOnly = $request->boolean('unused_only');
        $quickFilter = $request->query('quick_filter');
        if ($quickFilter !== null && $quickFilter !== '' && ! in_array($quickFilter, BoqItemsForPackageCreateQuery::QUICK_FILTER_VALUES, true)) {
            $quickFilter = null;
        }
        $cursor = $request->query('cursor');

        $boqVersion = $project->boqVersions()->where('status', 'active')->latest()->first();
        $units = $boqVersion
            ? $boqVersion->items()->distinct()->pluck('unit')->filter()->values()
            : collect();

        $cacheKey = sprintf(
            'boq-selector:%s:%s:%s:%s:%s:%s:%s:%s',
            $project->id,
            $boqVersion?->id ?? 'none',
            (string) $search,
            (string) $unit,
            (string) $leadType,
            $unusedOnly ? '1' : '0',
            (string) $quickFilter,
            (string) $cursor,
        );

        $boqItems = Cache::remember($cacheKey, 30, function () use ($project, $search, $unit, $leadType, $unusedOnly, $quickFilter, $cursor): \Illuminate\Contracts\Pagination\CursorPaginator {
            return $this->boqItemsQuery->executeCursorPaginated(
                $project,
                $search,
                $unit,
                $leadType,
                $unusedOnly,
                $quickFilter,
                $cursor,
                BoqItemsForPackageCreateQuery::PER_PAGE,
            );
        });

        $boqItems = $boqItems->through(function ($item): array {
            return $item->only([
                'id', 'sort_order', 'code', 'description_en', 'unit', 'qty',
                'revenue_amount', 'planned_cost', 'lead_type',
                'package_usage_count', 'request_usage_count', 'actual_cost_sum',
            ]);
        });

        return Inertia::render('Projects/ProcurementPackages/Create', [
            'project'   => $project->only('id', 'name', 'name_en', 'name_ar', 'code'),
            'boqItems'  => $boqItems,
            'units'     => $units,
            'filters'   => [
                'search'       => $search,
                'unit'         => $unit,
                'lead_type'    => $leadType,
                'unused_only'  => $unusedOnly,
                'quick_filter' => $quickFilter,
            ],
        ]);
    }

    public function store(Request $request, Project $project): RedirectResponse
    {
        $this->authorize('create', [ProcurementPackage::class, $project]);

        $validated = $request->validate([
            'name'            => 'required|string|max:255',
            'description'     => 'nullable|string',
            'currency'        => 'required|string|size:3',
            'needed_by_date'  => 'nullable|date',
            'boq_item_ids'    => 'required|array',
            'boq_item_ids.*'  => 'uuid|exists:project_boq_items,id',
            'attachments'     => 'nullable|array',
            'attachments.*.title' => 'required_with:attachments.*|string|max:200',
            'attachments.*.document_type' => 'nullable|string|in:specifications,drawings,boq,other',
            'attachments.*.source_type' => 'required_with:attachments.*|string|in:upload,google_drive,dropbox,onedrive,wetransfer,other_link',
            'attachments.*.external_url' => 'nullable|string|max:500',
            'attachments.*.external_provider' => 'nullable|string|max:30',
            'attachments.*.file' => 'nullable|file|mimes:pdf,doc,docx,xls,xlsx,png,jpg,jpeg|max:10240',
        ]);

        $package = DB::transaction(function () use ($project, $validated, $request): ProcurementPackage {
            $packageNo = $this->numberingService->nextPackageNo($project);

            $itemIds = array_unique($validated['boq_item_ids']);
            $items = ProjectBoqItem::where('project_id', $project->id)->whereIn('id', $itemIds)->get();
            $estimatedRevenue = $items->sum('revenue_amount');
            $estimatedCost = $items->sum('planned_cost');

            $package = $project->procurementPackages()->create([
                'package_no'         => $packageNo,
                'name'               => $validated['name'],
                'description'        => $validated['description'] ?? null,
                'currency'           => $validated['currency'],
                'needed_by_date'     => isset($validated['needed_by_date']) ? $validated['needed_by_date'] : null,
                'estimated_revenue'  => $estimatedRevenue,
                'estimated_cost'     => $estimatedCost,
                'actual_cost'        => 0,
                'status'            => ProcurementPackage::STATUS_DRAFT,
                'created_by'         => $request->user()->id,
            ]);

            $package->boqItems()->attach($items->pluck('id')->all());

            if (! empty($validated['attachments'])) {
                foreach ($validated['attachments'] as $att) {
                    $filePath = null;
                    $mimeType = null;
                    if (isset($att['file']) && $att['file'] instanceof \Illuminate\Http\UploadedFile) {
                        $file = $att['file'];
                        $this->mimeValidator->validate($file, self::PACKAGE_ATTACHMENT_MIMES, self::PACKAGE_ATTACHMENT_EXTENSIONS, 'attachments.*.file');
                        $path = $file->store('procurement_attachments/' . $package->id, ['disk' => config('filesystems.default')]);
                        $filePath = $path;
                        $mimeType = $file->getMimeType();
                    }
                    $package->attachments()->create([
                        'document_type'      => $att['document_type'] ?? null,
                        'source_type'        => $att['source_type'] ?? 'other_link',
                        'title'              => $att['title'],
                        'file_path'          => $filePath,
                        'external_url'       => $att['external_url'] ?? null,
                        'external_provider'  => $att['external_provider'] ?? null,
                        'mime_type'          => $mimeType,
                        'uploaded_by'        => $request->user()->id,
                    ]);
                }
            }

            $readiness = app(PackageReadinessService::class)->check($package);
            $package->update([
                'readiness_score' => $readiness['score'],
                'readiness_cached_at' => now(),
            ]);

            return $package->fresh(['project', 'boqItems', 'attachments']);
        });

        $this->activityLogger->log('procurement_package.created', $package, [], $package->toArray(), $request->user());

        return redirect()
            ->route('projects.procurement-packages.show', [$project->id, $package->id])
            ->with('success', 'Procurement package created successfully.');
    }

    public function show(Request $request, Project $project, ProcurementPackage $package): Response
    {
        $this->authorize('view', $package);
        if ($package->project_id !== $project->id) {
            abort(404);
        }

        $package->load([
            'project:id,name,name_en,name_ar,code',
            'boqItems',
            'requests',
            'attachments',
            'createdByUser:id,name',
            'approvedBy:id,name',
        ]);

        $packagePayload = $package->toArray();
        $attachments = $package->attachments;

        $packageDocuments = $attachments->map(function (ProcurementPackageAttachment $a) use ($project, $package): array {
            $baseRouteParams = [
                'project'    => $project->id,
                'package'    => $package->id,
                'attachment' => $a->id,
            ];

            $downloadUrl = $a->external_url
                ? ($a->external_url ?? '')
                : ($a->file_path ? route('projects.procurement-packages.attachments.download', $baseRouteParams) : '');

            $previewUrl = $a->external_url
                ? $a->external_url
                : ($a->file_path ? route('projects.procurement-packages.attachments.download', $baseRouteParams + ['inline' => 1]) : null);

            return [
                'id'            => (string) $a->id,
                'name'          => $a->title !== '' ? $a->title : ($a->document_type ?? 'Attachment'),
                'document_type' => $a->document_type,
                'version'       => $a->version ?? 1,
                'is_current'    => $a->is_current ?? true,
                'uploaded_at'   => $a->created_at?->format('d M Y'),
                'uploaded_by'   => $a->uploadedByUser?->name,
                'download_url'  => $downloadUrl,
                'preview_url'   => $previewUrl,
            ];
        })->values();

        $uploadedTypes = $attachments
            ->where('is_current', true)
            ->pluck('document_type')
            ->filter()
            ->unique()
            ->values()
            ->all();

        $missingDocuments = DocumentRequirements::missingForPackage($uploadedTypes);
        $packagePayload['attachments'] = $attachments->map(function ($a) use ($project, $package): array {
            $baseRouteParams = [
                'project'    => $project->id,
                'package'    => $package->id,
                'attachment' => $a->id,
            ];
            $downloadUrl = $a->external_url
                ? null
                : ($a->file_path ? route('projects.procurement-packages.attachments.download', $baseRouteParams) : null);
            $previewUrl = $a->external_url
                ? $a->external_url
                : ($a->file_path ? route('projects.procurement-packages.attachments.download', $baseRouteParams + ['inline' => 1]) : null);

            return [
                'id'            => $a->id,
                'title'         => $a->title,
                'document_type' => $a->document_type,
                'source_type'   => $a->source_type,
                'file_path'     => $a->file_path,
                'external_url'  => $a->external_url,
                'external_provider' => $a->external_provider,
                'download_url'  => $downloadUrl,
                'url'           => $previewUrl,
                'created_at'    => $a->created_at?->toIso8601String(),
            ];
        })->values()->all();

        $packagePayload['approved_by_name'] = $package->approvedBy?->name;
        $packagePayload['approved_at_formatted'] = $package->approved_at?->format('d M Y H:i');
        $packagePayload['submitted_for_approval_at_formatted'] = $package->submitted_for_approval_at?->format('d M Y H:i');
        $packagePayload['approval_status'] = $package->approval_status ?? 'draft';

        return Inertia::render('Projects/ProcurementPackages/Show', [
            'project'        => $project->only('id', 'name', 'name_en', 'name_ar', 'code'),
            'package'        => $packagePayload,
            'documents'      => $packageDocuments,
            'missing_documents' => $missingDocuments,
            'document_completeness' => count($missingDocuments) === 0,
            'approvalStatus' => $package->approval_status ?? 'draft',
            'approvedBy'     => $package->approvedBy?->name,
            'approvedAt'     => $package->approved_at?->format('d M Y H:i'),
            'approvalNotes'  => $package->approval_notes,
            'submittedAt'    => $package->submitted_for_approval_at?->format('d M Y H:i'),
            'can'            => [
                'submitPackage'  => $request->user()->can('update', $package),
                'approvePackage' => $request->user()->can('approve', $package),
            ],
            'timeline' => TimelineBuilder::forSubject(\App\Models\ProcurementPackage::class, (string) $package->id),
        ]);
    }

    public function submitForApproval(Request $request, Project $project, ProcurementPackage $package): RedirectResponse
    {
        \Log::info('submitForApproval called', [
            'package_id' => $package->id,
            'approval_status_before' => $package->approval_status,
            'can_submit' => $package->canSubmitForApproval(),
            'user_id' => auth()->id(),
        ]);

        $this->authorize('update', $package);
        if ($package->project_id !== $project->id) {
            abort(404);
        }

        \Log::info('submitForApproval authorization passed');

        \Log::info('submitForApproval transition check', [
            'can_submit' => $package->canSubmitForApproval(),
        ]);
        abort_unless($package->canSubmitForApproval(), 422, __('packages.cannot_submit_for_approval'));

        $package->update([
            'approval_status'               => ProcurementPackage::APPROVAL_SUBMITTED,
            'submitted_for_approval_at'    => now(),
        ]);

        \Log::info('submitForApproval update completed', [
            'approval_status_after' => $package->fresh()->approval_status,
        ]);

        $this->activityLogger->log('procurement_package.submitted_for_approval', $package, [], $package->fresh()->toArray(), $request->user());

        return redirect()
            ->route('projects.procurement-packages.show', [$package->project_id, $package->id])
            ->with('success', __('packages.submitted_for_approval'));
    }

    public function approve(Request $request, Project $project, ProcurementPackage $package): RedirectResponse
    {
        $this->authorize('approve', $package);
        if ($package->project_id !== $project->id) {
            abort(404);
        }
        abort_unless($package->canApprove(), 422, __('packages.cannot_submit_for_approval'));

        $package->update([
            'approval_status' => ProcurementPackage::APPROVAL_APPROVED,
            'approved_by'     => $request->user()->id,
            'approved_at'     => now(),
            'approval_notes'  => $request->input('approval_notes'),
        ]);

        $this->activityLogger->log('procurement_package.approved', $package, [], $package->fresh()->toArray(), $request->user());

        return redirect()
            ->route('projects.procurement-packages.show', [$package->project_id, $package->id])
            ->with('success', __('packages.approved'));
    }

    public function reject(Request $request, Project $project, ProcurementPackage $package): RedirectResponse
    {
        $this->authorize('approve', $package);
        if ($package->project_id !== $project->id) {
            abort(404);
        }
        abort_unless($package->canReject(), 422, __('packages.cannot_submit_for_approval'));

        $validated = $request->validate([
            'approval_notes' => ['required', 'string', 'max:1000'],
        ]);

        $package->update([
            'approval_status' => ProcurementPackage::APPROVAL_REJECTED,
            'approved_by'     => $request->user()->id,
            'approved_at'     => now(),
            'approval_notes'  => $validated['approval_notes'],
        ]);

        $this->activityLogger->log('procurement_package.rejected', $package, [], $package->fresh()->toArray(), $request->user());

        return redirect()
            ->route('projects.procurement-packages.show', [$package->project_id, $package->id])
            ->with('success', __('packages.rejected'));
    }

    public function transition(Request $request, Project $project, ProcurementPackage $package): RedirectResponse
    {
        $this->authorize('update', $package);
        if ($package->project_id !== $project->id) {
            abort(404);
        }

        $data = $request->validate([
            'status' => ['required', 'string', Rule::in(ProcurementPackage::STATUSES)],
        ]);

        $newStatus = $data['status'];

        if (! $package->canTransitionTo($newStatus)) {
            return back()->withErrors([
                'status' => __('packages.invalid_transition'),
            ]);
        }

        if ($newStatus === ProcurementPackage::STATUS_APPROVED_FOR_RFQ
            && $package->approval_status !== ProcurementPackage::APPROVAL_APPROVED) {
            return back()->withErrors([
                'status' => __('packages.requires_approval_first'),
            ]);
        }

        if ($newStatus === $package->status) {
            return back()->with('success', __('packages.status_updated'));
        }

        $oldStatus = $package->status;

        $package->changeStatus($newStatus, $request->user());

        $this->activityLogger->log(
            'procurement_package.status_changed',
            $package,
            ['status' => $oldStatus],
            ['status' => $newStatus],
            $request->user()
        );

        return back()->with('success', __('packages.status_updated'));
    }

    public function print(Request $request, Project $project, ProcurementPackage $package)
    {
        $this->authorize('view', $package);
        if ($package->project_id !== $project->id) {
            abort(404);
        }

        $this->loadPackageForDocument($package);
        $branding = BrandingHelper::get();

        return response()->view('pdf.procurement-package', compact('package', 'branding'));
    }

    public function pdf(Request $request, Project $project, ProcurementPackage $package)
    {
        $this->authorize('view', $package);
        if ($package->project_id !== $project->id) {
            abort(404);
        }

        $this->loadPackageForDocument($package);
        $branding = BrandingHelper::get();

        $reference = $package->package_no ?? $package->id;

        $pdf = Pdf::loadView('pdf.procurement-package', compact('package', 'branding'))
            ->setPaper('a4', 'portrait');

        return $pdf->download("package-{$reference}.pdf");
    }

    private function loadPackageForDocument(ProcurementPackage $package): void
    {
        $package->loadMissing([
            'project:id,name,name_en,name_ar,code',
            'boqItems',
            'attachments',
            'createdByUser:id,name',
        ]);
    }

    public function storeAttachment(Request $request, Project $project, ProcurementPackage $package): RedirectResponse
    {
        $this->authorize('view', $package);
        if ($package->project_id !== $project->id) {
            abort(404);
        }

        $validated = $request->validate([
            'title'              => 'required|string|max:200',
            'document_type'     => 'nullable|string|in:specifications,drawings,boq,other',
            'source_type'       => 'required|string|in:upload,google_drive,dropbox,onedrive,wetransfer,other_link',
            'external_url'      => 'nullable|string|max:500',
            'external_provider' => 'nullable|string|max:30',
            'file'              => 'nullable|file|mimes:pdf,doc,docx,xls,xlsx,png,jpg,jpeg|max:10240',
        ]);

        $filePath = null;
        $mimeType = null;
        if ($request->hasFile('file') && $request->file('file')->isValid()) {
            $file = $request->file('file');
            $this->mimeValidator->validate($file, self::PACKAGE_ATTACHMENT_MIMES, self::PACKAGE_ATTACHMENT_EXTENSIONS, 'file');
            $filePath = $file->store(
                'procurement_attachments/' . $package->id,
                ['disk' => config('filesystems.default')]
            );
            $mimeType = $file->getMimeType();
        }

        $package->attachments()->create([
            'document_type'     => $validated['document_type'] ?? null,
            'source_type'       => $validated['source_type'],
            'title'             => $validated['title'],
            'file_path'         => $filePath,
            'external_url'      => $validated['external_url'] ?? null,
            'external_provider' => $validated['external_provider'] ?? null,
            'mime_type'         => $mimeType,
            'uploaded_by'       => $request->user()->id,
        ]);

        return back()->with('success', 'Attachment added.');
    }

    public function downloadAttachment(Request $request, Project $project, ProcurementPackage $package, ProcurementPackageAttachment $attachment): StreamedResponse|\Illuminate\Http\RedirectResponse
    {
        $this->authorize('view', $package);
        if ($package->project_id !== $project->id || (string) $attachment->package_id !== (string) $package->id) {
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
                $filename = $this->attachmentDownloadFilename($attachment, $disk);
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
                        'Content-Type'        => $mimeType ?: 'application/octet-stream',
                        'Content-Disposition' => $dispositionHeader,
                    ]);
                }

                return Storage::disk($disk)->download($attachment->file_path, $filename);
            }
        }

        abort(404, 'Attachment file not found.');
    }

    private function attachmentDownloadFilename(ProcurementPackageAttachment $attachment, string $disk): string
    {
        if ($attachment->title !== '') {
            $base = (string) preg_replace('/[^A-Za-z0-9._-]+/', '_', $attachment->title);
        } else {
            $base = pathinfo($attachment->file_path, PATHINFO_FILENAME);
            if ($base === '' || $base === false || $base === null) {
                $base = 'attachment';
            }
        }
        $ext = null;
        if ($attachment->mime_type && isset(self::MIME_TO_EXTENSION[$attachment->mime_type])) {
            $ext = self::MIME_TO_EXTENSION[$attachment->mime_type];
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
}
