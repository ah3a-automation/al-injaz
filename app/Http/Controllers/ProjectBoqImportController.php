<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Jobs\ImportBoqJob;
use App\Models\BoqImportJob;
use App\Models\Project;
use App\Services\FileMimeValidationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use PhpOffice\PhpSpreadsheet\IOFactory;

class ProjectBoqImportController extends Controller
{
    private const BOQ_IMPORT_MIMES = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
    ];

    private const BOQ_IMPORT_EXTENSIONS = ['xlsx', 'xls'];

    public function __construct(
        private readonly FileMimeValidationService $mimeValidator,
    ) {}
    public function index(): Response
    {
        $this->authorize('viewAny', Project::class);

        $projects = Project::orderBy('name')->get(['id', 'name', 'name_en']);

        return Inertia::render('Projects/BoqImportIndex', [
            'projects' => $projects,
        ]);
    }

    public function show(Request $request, Project $project): Response
    {
        $this->authorize('update', $project);

        $importJobId = $request->query('job');
        $preview     = null;

        if ($importJobId) {
            $job = BoqImportJob::where('id', $importJobId)
                ->where('project_id', $project->id)
                ->where('status', BoqImportJob::STATUS_PENDING)
                ->first();

            if ($job) {
                $preview = Cache::get('boq_preview_' . $importJobId);
            } else {
                $importJobId = null;
            }
        }

        return Inertia::render('Projects/BoqImportPreview', [
            'project'     => [
                'id'   => $project->id,
                'name' => $project->name,
            ],
            'preview'     => $preview,
            'importJobId' => $importJobId,
        ]);
    }

    public function preview(Request $request, Project $project): RedirectResponse
    {
        $this->authorize('update', $project);

        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls|max:10240',
        ]);

        $file = $request->file('file');
        $this->mimeValidator->validate($file, self::BOQ_IMPORT_MIMES, self::BOQ_IMPORT_EXTENSIONS, 'file');

        Storage::disk('local')->makeDirectory('boq_imports');
        $path = $file->store('boq_imports', 'local');

        $job = BoqImportJob::create([
            'project_id' => $project->id,
            'status'     => BoqImportJob::STATUS_PENDING,
            'file_path'  => $path,
            'progress'   => 0,
        ]);

        $preview = $this->buildPreview($path);

        Cache::put('boq_preview_' . $job->id, $preview, now()->addHours(2));

        $url = route('projects.boq-import.show', $project->id) . '?job=' . $job->id;
        return redirect($url);
    }

    public function cancel(Request $request, Project $project): RedirectResponse
    {
        $this->authorize('update', $project);

        $importJobId = $request->input('import_job_id');
        if ($importJobId) {
            Cache::forget('boq_preview_' . $importJobId);
        }

        return redirect()->route('projects.boq-import.show', $project);
    }

    /**
     * @return array{headers: array<int, string>, rows: array<int, array<string, mixed>>, total: int}
     */
    private function buildPreview(string $path): array
    {
        $fullPath = Storage::disk('local')->path($path);
        $spreadsheet = IOFactory::load($fullPath);
        $sheet = $spreadsheet->getActiveSheet();
        $highestRow = min((int) $sheet->getHighestRow(), 100);
        $highestCol = min(50, (int) \PhpOffice\PhpSpreadsheet\Cell\Coordinate::columnIndexFromString($sheet->getHighestColumn()));

        $headerMap = [];
        for ($col = 1; $col <= $highestCol; $col++) {
            $val = $sheet->getCellByColumnAndRow($col, 1)->getValue();
            if ($val !== null && $val !== '') {
                $headerMap[$col] = trim((string) $val);
            }
        }

        $rows = [];
        for ($r = 2; $r <= $highestRow; $r++) {
            $row = ['_row' => $r];
            foreach ($headerMap as $col => $header) {
                $val = $sheet->getCellByColumnAndRow($col, $r)->getValue();
                $row[$header] = $val !== null ? trim((string) $val) : '';
            }
            $rows[] = $row;
        }

        return [
            'headers' => array_values($headerMap),
            'rows'    => $rows,
            'total'   => (int) $sheet->getHighestRow(),
        ];
    }

    public function store(Request $request, Project $project): RedirectResponse
    {
        $this->authorize('update', $project);

        $validated = $request->validate([
            'import_job_id' => 'required|uuid|exists:boq_import_jobs,id',
        ]);

        $jobId = $validated['import_job_id'];

        $job = BoqImportJob::where('id', $jobId)
            ->where('project_id', $project->id)
            ->where('status', BoqImportJob::STATUS_PENDING)
            ->firstOrFail();

        $job->update([
            'status'     => BoqImportJob::STATUS_RUNNING,
            'started_at' => now(),
        ]);

        ImportBoqJob::dispatch($job->id, $request->user()->id)
            ->onQueue('imports');

        Cache::forget('boq_preview_' . $jobId);

        return redirect()
            ->route('projects.boq-import.show', $project)
            ->with('success', 'BOQ import started.');
    }
}
