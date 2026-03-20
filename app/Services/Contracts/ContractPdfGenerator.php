<?php

declare(strict_types=1);

namespace App\Services\Contracts;

use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;

/**
 * Produces a PDF file from assembled contract document data.
 */
final class ContractPdfGenerator
{
    /**
     * @param  array{contract_metadata: array<string, mixed>, source_metadata: array<string, mixed>, articles: array<int, array{article_code: string, title_en: string, title_ar: string, rendered_content_en: string, rendered_content_ar: string}>, generation_mode: string, issue_package_metadata: array<string, mixed>|null}  $assembled
     * @return array{file_path: string, file_name: string, mime_type: string, file_size_bytes: int|null}
     */
    public function generate(array $assembled, string $storagePath, string $fileName): array
    {
        $view = view('contracts.generated-pdf', ['data' => $assembled]);
        $html = $view->render();

        $pdf = Pdf::loadHTML($html)->setPaper('a4', 'portrait');
        $output = $pdf->output();

        $fullPath = $storagePath . '/' . $fileName;
        Storage::disk('local')->put($fullPath, $output);

        $size = strlen($output);

        return [
            'file_path' => $fullPath,
            'file_name' => $fileName,
            'mime_type' => 'application/pdf',
            'file_size_bytes' => $size,
        ];
    }
}
