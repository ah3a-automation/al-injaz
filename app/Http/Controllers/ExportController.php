<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Export;
use App\Services\Storage\S3ExportService;
use App\Support\Export\ExportService;
use App\Support\Export\ProjectExport;
use App\Support\Export\SupplierExport;
use App\Support\Export\TaskExport;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ExportController extends Controller
{
    public function __construct(
        private readonly S3ExportService $s3ExportService
    ) {}
    public function index(Request $request): Response
    {
        $exports = Export::query()
            ->where('user_id', $request->user()->id)
            ->latest()
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Exports/Index', [
            'exports' => $exports,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'type'    => 'required|string|in:projects,tasks,suppliers',
            'format'  => 'required|string|in:xlsx,pdf',
            'filters' => 'nullable|array',
        ]);

        $exportables = [
            'projects'  => ProjectExport::class,
            'tasks'     => TaskExport::class,
            'suppliers' => SupplierExport::class,
        ];

        if (! isset($exportables[$validated['type']])) {
            return response()->json(['error' => 'Unknown export type'], 422);
        }

        $export = app(ExportService::class)->dispatch(
            $exportables[$validated['type']],
            $validated['format'],
            $validated['filters'] ?? [],
            $request->user()
        );

        return response()->json([
            'export_id' => $export->id,
            'message'   => 'Export queued. Download will be ready shortly.',
        ]);
    }

    public function show(Request $request, Export $export): JsonResponse
    {
        if ($export->user_id !== $request->user()->id) {
            abort(403);
        }

        if ($export->isCompleted() && !$export->isExpired()) {
            $url = $this->s3ExportService->createPresignedDownloadUrl($export->file_path, 15);

            return response()->json(['status' => 'completed', 'download_url' => $url]);
        }

        if ($export->status === Export::STATUS_FAILED) {
            return response()->json([
                'status' => 'failed',
                'error'  => $export->error_message,
            ]);
        }

        if ($export->isExpired()) {
            return response()->json(['status' => 'expired']);
        }

        return response()->json(['status' => $export->status]);
    }
}
