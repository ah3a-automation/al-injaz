<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Export;
use App\Support\Export\ExportService;
use App\Support\Export\ProjectExport;
use App\Support\Export\SupplierExport;
use App\Support\Export\TaskExport;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ExportController extends Controller
{
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
            // Create a temporary client pointing to localhost (browser-accessible)
            // so the signed URL is valid for the browser, not the internal network
            $s3 = new \Aws\S3\S3Client([
                'version'                 => 'latest',
                'region'                  => config('filesystems.disks.s3.region'),
                'endpoint'                => 'http://localhost:9000',
                'use_path_style_endpoint' => true,
                'credentials'             => [
                    'key'    => config('filesystems.disks.s3.key'),
                    'secret' => config('filesystems.disks.s3.secret'),
                ],
            ]);
        
            $cmd = $s3->getCommand('GetObject', [
                'Bucket' => config('filesystems.disks.s3.bucket'),
                'Key'    => $export->file_path,
            ]);
        
            $url = (string) $s3->createPresignedRequest($cmd, '+30 minutes')->getUri();
        
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
