<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\BoqChangeLog;
use App\Models\BoqImportJob;
use App\Models\BoqVersion;
use App\Models\Project;
use App\Models\ProjectBoqItem;
use App\Models\User;
use App\Services\ActivityLogger;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class ImportBoqJob implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public int $tries = 1;

    public int $timeout = 600;

    private const MAX_ROWS = 5000;

    /** @var array<int, array{row_number: int, column: string, error_message: string}> */
    private array $errors = [];

    /** @var array<string, array{planned_cost: float, qty: float, unit_price: float|null, description_en: string, description_ar: string|null}> code => item data */
    private array $newItemsByCode = [];

    public function __construct(
        public string $importJobId,
        public ?int $importedByUserId = null
    ) {}

    public function handle(): void
    {
        Log::info('BOQ import step', ['step' => 'handle started']);

        $job = BoqImportJob::findOrFail($this->importJobId);
        $project = Project::findOrFail($job->project_id);

        $job->update([
            'status'     => BoqImportJob::STATUS_RUNNING,
            'started_at' => now(),
        ]);

        $causer = $this->importedByUserId ? User::find($this->importedByUserId) : null;

        try {
            if ($causer instanceof User) {
                app(ActivityLogger::class)->log('boq.import_started', $job, [], $job->toArray(), $causer);
            }

            if (! Storage::disk('local')->exists($job->file_path ?? '')) {
                throw new \RuntimeException('BOQ import file missing: ' . ($job->file_path ?? 'null'));
            }

            $path = Storage::disk('local')->path($job->file_path);
            Log::info('BOQ import step', ['step' => 'file path resolved']);

            Log::info('BOQ load path', [
                'relative' => $job->file_path,
                'absolute' => $path,
                'exists'   => file_exists($path),
            ]);

            $spreadsheet = IOFactory::load($path);
            Log::info('BOQ import step', ['step' => 'spreadsheet loaded']);

            $sheet = $spreadsheet->getActiveSheet();
            Log::info('BOQ import step', ['step' => 'sheet resolved']);

            $highestRow = min((int) $sheet->getHighestRow(), self::MAX_ROWS);
            Log::info('BOQ import step', ['step' => 'highestRow', 'value' => $highestRow]);

            $job->update(['rows_total' => $highestRow]);

            DB::transaction(function () use (
                $job,
                $project,
                $sheet,
                $highestRow,
                $causer
            ): void {
                $boqVersion = $this->createBoqVersion($project);
                $versionId = $boqVersion->id;

                $headerMap = $this->parseHeaderRow($sheet);

                $buffer = [];
                $batchSize = 500;
                $totalRevenue = 0.0;
                $totalPlannedCost = 0.0;
                $inserted = 0;

                Log::info('BOQ import step', ['step' => 'before row loop', 'highestRow' => $highestRow]);

                for ($rowNum = 2; $rowNum <= $highestRow; $rowNum++) {
                    if ($rowNum === 2) {
                        Log::info('BOQ import step', ['step' => 'first row', 'rowNum' => $rowNum]);
                    }
                    $rowData = $this->getRowData($sheet, $rowNum, $headerMap);
                    $validation = $this->validateRow($rowData, $rowNum);

                    if ($validation !== null) {
                        $this->errors[] = $validation;
                        $job->update([
                            'rows_processed' => $rowNum - 1,
                            'progress'       => (int) round((($rowNum - 1) / $highestRow) * 100),
                        ]);
                        continue;
                    }

                    $item = $this->createBoqItem($project, $versionId, $rowData, $rowNum - 1);
                    if ($item !== null) {
                        $buffer[] = $item;
                        $totalRevenue += (float) ($item['revenue_amount'] ?? 0);
                        $totalPlannedCost += (float) ($item['planned_cost'] ?? 0);
                        $itemCode = (string) ($item['code'] ?? '');
                        if ($itemCode !== '') {
                            $this->newItemsByCode[$itemCode] = [
                                'planned_cost'   => (float) ($item['planned_cost'] ?? 0),
                                'qty'            => (float) ($item['qty'] ?? 0),
                                'unit_price'     => isset($item['unit_price']) ? (float) $item['unit_price'] : null,
                                'description_en' => (string) ($item['description_en'] ?? ''),
                                'description_ar' => $item['description_ar'] ?? null,
                            ];
                        }
                        if (count($buffer) >= $batchSize) {
                            DB::table('project_boq_items')->insert($buffer);
                            $inserted += count($buffer);
                            $buffer = [];
                        }
                    }

                    $job->update([
                        'rows_processed' => $rowNum,
                        'progress'       => (int) round(($rowNum / $highestRow) * 100),
                    ]);
                }

                if (! empty($buffer)) {
                    DB::table('project_boq_items')->insert($buffer);
                    $inserted += count($buffer);
                }

                if (! empty($this->errors)) {
                    $errorPath = $this->exportErrorReport();
                    $job->update(['error_file_path' => $errorPath]);
                }

                $boqVersion->update([
                    'item_count'         => $inserted,
                    'total_revenue'      => $totalRevenue,
                    'total_planned_cost' => $totalPlannedCost,
                    'status'             => 'imported',
                    'imported_by'        => $this->importedByUserId,
                    'imported_at'        => now(),
                ]);

                $previousVersion = $this->getPreviousVersion($project, $boqVersion);
                $this->compareAndLogChanges($boqVersion, $previousVersion);

                if ($causer instanceof User) {
                    app(ActivityLogger::class)->log(
                        'boq.version_compared',
                        $boqVersion,
                        [],
                        ['previous_version_id' => $previousVersion?->id],
                        $causer
                    );
                }

                $boqVersion->activate();

                if ($causer instanceof User) {
                    app(ActivityLogger::class)->log(
                        'boq.version_created',
                        $boqVersion,
                        [],
                        $boqVersion->toArray(),
                        $causer
                    );
                }

                $job->update([
                    'status'      => BoqImportJob::STATUS_COMPLETED,
                    'finished_at' => now(),
                ]);
            });

            if ($causer instanceof User) {
                app(ActivityLogger::class)->log('boq.import_completed', $job, [], $job->toArray(), $causer);
            }
        } catch (\Throwable $e) {
            $job->update([
                'status'     => BoqImportJob::STATUS_FAILED,
                'finished_at' => now(),
            ]);
            if ($causer instanceof User) {
                app(ActivityLogger::class)->log(
                    'boq.import_failed',
                    $job,
                    [],
                    ['error' => $e->getMessage()],
                    $causer
                );
            }
            throw $e;
        }
    }

    private function createBoqVersion(Project $project): BoqVersion
    {
        $nextVersion = (int) BoqVersion::where('project_id', $project->id)
            ->max('version_no') + 1;

        $id = (string) \Illuminate\Support\Str::uuid();

        DB::table('boq_versions')->insert([
            'id'                 => $id,
            'project_id'         => $project->id,
            'version_no'         => $nextVersion,
            'label'              => 'Import ' . now()->format('Y-m-d H:i'),
            'status'             => 'draft',
            'item_count'         => 0,
            'total_revenue'      => 0,
            'total_planned_cost' => 0,
            'created_at'         => now(),
            'updated_at'         => now(),
        ]);

        return BoqVersion::findOrFail($id);
    }

    /** @return array<int, string> col index => canonical key */
    private function parseHeaderRow(\PhpOffice\PhpSpreadsheet\Worksheet\Worksheet $sheet): array
    {
        $colToCanonical = [];
        $col = 1;
        while (true) {
            $val = $sheet->getCellByColumnAndRow($col, 1)->getValue();
            if ($val === null || $val === '') {
                break;
            }
            $normalized = $this->normalizeHeaderName((string) $val);
            $canonical = $this->canonicalKeyForHeader($normalized);
            $colToCanonical[$col] = $canonical;
            $col++;
        }
        return $colToCanonical;
    }

    private function normalizeHeaderName(string $header): string
    {
        $t = trim(preg_replace('/\s+/', ' ', $header) ?? '');
        $t = str_replace(['.', ' ', "\t"], '_', $t);
        $t = (string) preg_replace('/_+/', '_', $t);
        return mb_strtolower(trim($t, '_'));
    }

    /** Dictionary: canonical key => normalized header aliases. planned_cost = TOTAL COST. */
    private const COLUMN_ALIASES = [
        'planned_cost'   => ['planned_cost', 'plannedcost', 'est_cost', 'estimated_cost', 'estimatedcost', 'cost', 'total_cost'],
        'unit_cost'      => ['unit_cost', 'unitcost'],
        'unit_price'     => ['unit_price', 'unitprice', 'revenue_unit_price'],
        'qty'            => ['qty', 'quantity'],
        'revenue_amount' => ['revenue', 'revenue_amount', 'total_revenue'],
        'code'           => ['code', 'item_code'],
        'description_en' => ['description_en', 'description'],
        'description_ar' => ['description_ar'],
        'unit'           => ['unit'],
        'lead_type'      => ['lead_type', 'leadtype'],
        'specifications' => ['specifications'],
        'is_provisional' => ['is_provisional'],
    ];

    private function canonicalKeyForHeader(string $normalized): string
    {
        foreach (self::COLUMN_ALIASES as $canonical => $list) {
            if (in_array($normalized, $list, true)) {
                return $canonical;
            }
        }
        return $normalized;
    }

    private function parseNumeric(mixed $value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }
        $s = is_string($value) ? str_replace([',', "\xc2\xa0"], '', trim($value)) : (string) $value;
        if ($s === '') {
            return null;
        }
        $n = filter_var($s, FILTER_VALIDATE_FLOAT);
        return $n !== false ? $n : null;
    }

    /** @return array<string, mixed> */
    private function getRowData(\PhpOffice\PhpSpreadsheet\Worksheet\Worksheet $sheet, int $rowNum, array $colToCanonical): array
    {
        $data = [];
        foreach ($colToCanonical as $col => $canonical) {
            $val = $sheet->getCellByColumnAndRow($col, $rowNum)->getValue();
            $data[$canonical] = $val !== null ? trim((string) $val) : '';
        }
        return $data;
    }

    /**
     * @param array<string, mixed> $rowData
     * @return array{row_number: int, column: string, error_message: string}|null
     */
    private function validateRow(array $rowData, int $rowNum): ?array
    {
        $code = trim((string) ($rowData['code'] ?? $rowData['item_code'] ?? ''));
        $descEn = trim((string) ($rowData['description_en'] ?? $rowData['description'] ?? ''));

        if ($code === '' && $descEn === '') {
            return null;
        }

        if ($descEn === '') {
            return [
                'row_number'    => $rowNum,
                'column'        => 'description_en',
                'error_message' => 'Description (EN) is required.',
            ];
        }

        $unitPrice = $this->parseNumeric($rowData['unit_price'] ?? $rowData['unit price'] ?? null) ?? 0.0;
        $qty = $this->parseNumeric($rowData['qty'] ?? $rowData['quantity'] ?? null) ?? 1.0;
        $revenueVal = $this->parseNumeric($rowData['revenue_amount'] ?? $rowData['revenue'] ?? null);
        $revenue = $revenueVal !== null ? $revenueVal : ($unitPrice * $qty);

        $plannedCostVal = $this->parseNumeric($rowData['planned_cost'] ?? $rowData['planned cost'] ?? null);
        $unitCostVal = $this->parseNumeric($rowData['unit_cost'] ?? $rowData['unit cost'] ?? null);
        $plannedCost = $plannedCostVal ?? (($unitCostVal !== null && $qty > 0) ? ($unitCostVal * $qty) : 0.0);

        if ($revenue < 0) {
            return [
                'row_number'    => $rowNum,
                'column'        => 'revenue_amount',
                'error_message' => 'Revenue amount cannot be negative.',
            ];
        }

        if ($plannedCost < 0) {
            return [
                'row_number'    => $rowNum,
                'column'        => 'planned_cost',
                'error_message' => 'Planned cost cannot be negative.',
            ];
        }

        return null;
    }

    /**
     * @param array<string, mixed> $rowData
     * @return array<string, mixed>|null
     */
    private function createBoqItem(Project $project, string $versionId, array $rowData, int $sortOrder): ?array
    {
        if (! $versionId) {
            throw new \RuntimeException('BOQ version id missing during import');
        }

        $code = trim((string) ($rowData['code'] ?? $rowData['item_code'] ?? ''));
        $descEn = trim((string) ($rowData['description_en'] ?? $rowData['description'] ?? ''));
        if ($descEn === '') {
            return null;
        }

        $unitPrice = $this->parseNumeric($rowData['unit_price'] ?? $rowData['unit price'] ?? null) ?? 0.0;
        $qty = $this->parseNumeric($rowData['qty'] ?? $rowData['quantity'] ?? null) ?? 1.0;
        $revenueVal = $this->parseNumeric($rowData['revenue_amount'] ?? $rowData['revenue'] ?? null);
        $revenue = $revenueVal !== null && $revenueVal >= 0 ? $revenueVal : ($unitPrice * $qty);

        $plannedCostVal = $this->parseNumeric($rowData['planned_cost'] ?? $rowData['planned cost'] ?? null);
        $unitCostVal = $this->parseNumeric($rowData['unit_cost'] ?? $rowData['unit cost'] ?? null);
        $plannedCost = ($plannedCostVal !== null && $plannedCostVal >= 0)
            ? $plannedCostVal
            : (($unitCostVal !== null && $qty > 0) ? ($unitCostVal * $qty) : 0.0);

        $id = (string) \Illuminate\Support\Str::uuid();

        return [
            'id'             => $id,
            'project_id'     => $project->id,
            'boq_version_id' => $versionId,
            'code'           => $code ?: 'ITEM-' . ($sortOrder + 1),
            'description_en' => $descEn,
            'description_ar' => $rowData['description_ar'] ?? null,
            'unit'           => $rowData['unit'] ?? null,
            'qty'            => $qty ?: null,
            'unit_price'     => $unitPrice ?: null,
            'revenue_amount' => $revenue,
            'planned_cost'   => $plannedCost,
            'specifications' => $rowData['specifications'] ?? null,
            'lead_type'      => in_array($rowData['lead_type'] ?? '', ['long', 'short']) ? $rowData['lead_type'] : 'short',
            'is_provisional' => filter_var($rowData['is_provisional'] ?? false, FILTER_VALIDATE_BOOLEAN),
            'sort_order'     => $sortOrder,
            'created_at'     => now(),
            'updated_at'     => now(),
        ];
    }

    private function getPreviousVersion(Project $project, BoqVersion $currentVersion): ?BoqVersion
    {
        return BoqVersion::where('project_id', $project->id)
            ->where('id', '!=', $currentVersion->id)
            ->whereIn('status', ['active', 'imported'])
            ->orderByDesc('version_no')
            ->first();
    }

    private function compareAndLogChanges(BoqVersion $newVersion, ?BoqVersion $previousVersion): void
    {
        $trackedFields = ['planned_cost', 'qty', 'unit_price', 'description_en', 'description_ar'];

        $oldItemsByCode = [];
        if ($previousVersion !== null) {
            foreach ($previousVersion->items as $item) {
                $code = $item->code ?? '';
                if ($code !== '') {
                    $oldItemsByCode[$code] = [
                        'planned_cost'   => (float) ($item->planned_cost ?? 0),
                        'qty'           => (float) ($item->qty ?? 0),
                        'unit_price'     => $item->unit_price !== null ? (float) $item->unit_price : null,
                        'description_en' => (string) ($item->description_en ?? ''),
                        'description_ar' => $item->description_ar,
                    ];
                }
            }
        }

        $newItemsByCode = $this->newItemsByCode;

        foreach ($newItemsByCode as $code => $newData) {
            $newCost = $newData['planned_cost'];
            if (! isset($oldItemsByCode[$code])) {
                BoqChangeLog::create([
                    'boq_version_id' => $newVersion->id,
                    'item_code'      => $code,
                    'change_type'    => BoqChangeLog::CHANGE_ADDED,
                    'old_cost'       => null,
                    'new_cost'       => $newCost,
                    'cost_impact'    => $newCost,
                    'old_values'     => null,
                    'new_values'     => array_intersect_key($newData, array_flip($trackedFields)),
                    'changed_by'     => $this->importedByUserId,
                ]);
            } else {
                $oldData = $oldItemsByCode[$code];
                $oldCost = $oldData['planned_cost'];
                $changedFields = [];
                foreach ($trackedFields as $field) {
                    $oldVal = $oldData[$field] ?? null;
                    $newVal = $newData[$field] ?? null;
                    if (is_float($oldVal) && is_float($newVal)) {
                        if (abs($oldVal - $newVal) > 0.0001) {
                            $changedFields[$field] = true;
                        }
                    } elseif ((string) $oldVal !== (string) $newVal) {
                        $changedFields[$field] = true;
                    }
                }
                if (! empty($changedFields)) {
                    $costImpact = $newCost - $oldCost;
                    BoqChangeLog::create([
                        'boq_version_id' => $newVersion->id,
                        'item_code'      => $code,
                        'change_type'    => BoqChangeLog::CHANGE_MODIFIED,
                        'old_cost'       => $oldCost,
                        'new_cost'       => $newCost,
                        'cost_impact'    => $costImpact,
                        'old_values'     => array_intersect_key($oldData, array_flip($trackedFields)),
                        'new_values'     => array_intersect_key($newData, array_flip($trackedFields)),
                        'changed_by'     => $this->importedByUserId,
                    ]);
                }
                unset($oldItemsByCode[$code]);
            }
        }

        foreach (array_keys($oldItemsByCode) as $code) {
            $oldData = $oldItemsByCode[$code];
            $oldCost = $oldData['planned_cost'];
            BoqChangeLog::create([
                'boq_version_id' => $newVersion->id,
                'item_code'      => $code,
                'change_type'    => BoqChangeLog::CHANGE_REMOVED,
                'old_cost'       => $oldCost,
                'new_cost'       => null,
                'cost_impact'    => -$oldCost,
                'old_values'     => array_intersect_key($oldData, array_flip($trackedFields)),
                'new_values'     => null,
                'changed_by'     => $this->importedByUserId,
            ]);
        }
    }

    private function exportErrorReport(): string
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Errors');
        $sheet->setCellValue('A1', 'row_number');
        $sheet->setCellValue('B1', 'column');
        $sheet->setCellValue('C1', 'error_message');

        $row = 2;
        foreach ($this->errors as $err) {
            $sheet->setCellValue('A' . $row, $err['row_number']);
            $sheet->setCellValue('B' . $row, $err['column']);
            $sheet->setCellValue('C' . $row, $err['error_message']);
            $row++;
        }

        $path = 'boq_imports/errors/' . $this->importJobId . '_boq_import_errors.xlsx';
        $fullPath = storage_path('app/' . $path);
        $dir = dirname($fullPath);
        if (! is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        $writer = new Xlsx($spreadsheet);
        $writer->save($fullPath);
        $spreadsheet->disconnectWorksheets();

        return $path;
    }
}
