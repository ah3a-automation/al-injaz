<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\Export;
use App\Support\Export\Contracts\Exportable;
use Barryvdh\DomPDF\Facade\Pdf;
use App\Support\BrandingHelper;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class ProcessExportJob implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public int $tries = 3;

    /** @var array<int,int> */
    public array $backoff = [30, 60, 120];

    public int $timeout = 300;

    public function __construct(
        public string $exportId,
        public string $exportableClass
    ) {}

    public function handle(): void
    {
        Log::info('Export job started', [
            'export_id' => $this->exportId
        ]);

        $export = Export::findOrFail($this->exportId);

        $export->update([
            'status' => Export::STATUS_PROCESSING
        ]);

        $exportable = app($this->exportableClass);
        assert($exportable instanceof Exportable);

        // Use only getQuery() + chunk() + mapRow() — never getRows()
        $headings = $exportable->getHeadings();
        $title = $exportable->getTitle();

        $tempFile = $this->generateFile(
            $export,
            $exportable,
            $title,
            $headings
        );

        $path = sprintf(
            'exports/%s/%s.%s',
            $export->type,
            $export->id,
            $export->format
        );

        Storage::disk('s3')->put($path, fopen($tempFile, 'r'));

        unlink($tempFile);

        $export->update([
            'status'     => Export::STATUS_COMPLETED,
            'file_path'  => $path,
            'expires_at' => now()->addMinutes(30),
        ]);

        Log::info('Export job completed', [
            'export_id' => $this->exportId,
            'path' => $path
        ]);
    }

    private function generateFile(
        Export $export,
        Exportable $exportable,
        string $title,
        array $headings
    ): string {

        if ($export->format === 'xlsx') {
            return $this->generateXlsx($export, $exportable, $title, $headings);
        }

        if ($export->format === 'pdf') {
            return $this->generatePdf($export, $exportable, $title, $headings);
        }

        throw new \InvalidArgumentException("Unsupported format: {$export->format}");
    }

    private function generateXlsx(
        Export $export,
        Exportable $exportable,
        string $title,
        array $headings
    ): string {

        $spreadsheet = new Spreadsheet();

        $sheet = $spreadsheet->getActiveSheet();

        $sheet->setTitle(mb_substr($title, 0, 31));

        // headings
        foreach ($headings as $col => $heading) {
            $sheet->setCellValueByColumnAndRow(
                $col + 1,
                1,
                $heading
            );
        }

        foreach (range(1, count($headings)) as $col) {
            $sheet->getColumnDimensionByColumn($col)->setAutoSize(true);
        }

        $rowIndex = 2;

        // Chunked query — memory-safe, no full collection load
        $query = $exportable->getQuery($export->filters ?? []);
        $query->chunk(1000, function ($models) use ($sheet, $exportable, &$rowIndex): void {

            foreach ($models as $model) {

                $row = $exportable->mapRow($model);

                foreach (array_values($row) as $col => $value) {

                    $sheet->setCellValueByColumnAndRow(
                        $col + 1,
                        $rowIndex,
                        $value
                    );

                }

                $rowIndex++;

            }

        });

        $tempFile = tempnam(sys_get_temp_dir(), 'export_') . '.xlsx';

        $writer = new Xlsx($spreadsheet);

        $writer->save($tempFile);

        $spreadsheet->disconnectWorksheets();

        unset($spreadsheet);

        return $tempFile;
    }

    private function generatePdf(
        Export $export,
        Exportable $exportable,
        string $title,
        array $headings
    ): string {

        $rows = collect();

        $query = $exportable->getQuery($export->filters ?? []);

        $query->chunk(1000, function ($models) use (&$rows, $exportable): void {
            foreach ($models as $model) {
                $rows->push($exportable->mapRow($model));
            }
        });

        $branding = BrandingHelper::get();

        $pdf = Pdf::loadView(
            'exports.pdf',
            compact('title', 'headings', 'rows', 'branding')
        )->setPaper('a4', 'portrait');

        $tempFile = tempnam(sys_get_temp_dir(), 'export_') . '.pdf';

        file_put_contents(
            $tempFile,
            $pdf->output()
        );

        return $tempFile;
    }

    public function failed(\Throwable $exception): void
    {
        Log::error('Export job failed', [
            'export_id' => $this->exportId,
            'message' => $exception->getMessage(),
            'trace' => $exception->getTraceAsString(),
        ]);

        Export::where('id', $this->exportId)->update([
            'status'        => Export::STATUS_FAILED,
            'error_message' => $exception->getMessage(),
        ]);
    }
}