<?php

declare(strict_types=1);

namespace App\Services\Contracts;

use Illuminate\Support\Facades\Storage;
use PhpOffice\PhpWord\IOFactory;
use PhpOffice\PhpWord\PhpWord;

/**
 * Produces a DOCX file from assembled contract document data.
 */
final class ContractDocxGenerator
{
    /**
     * @param  array{contract_metadata: array<string, mixed>, source_metadata: array<string, mixed>, articles: array<int, array<string, mixed>>, generation_mode: string, issue_package_metadata: array<string, mixed>|null}  $assembled
     * @return array{file_path: string, file_name: string, mime_type: string, file_size_bytes: int|null}
     */
    public function generate(array $assembled, string $storagePath, string $fileName): array
    {
        $phpWord = new PhpWord();
        $section = $phpWord->addSection();

        $contractNumber = $assembled['contract_metadata']['contract_number'] ?? '—';
        $section->addTitle('Contract: ' . $contractNumber, 1);

        $titleEn = $assembled['contract_metadata']['title_en'] ?? $assembled['contract_metadata']['title_ar'] ?? '';
        if ($titleEn !== '') {
            $section->addText($titleEn, ['bold' => true]);
        }
        $titleAr = $assembled['contract_metadata']['title_ar'] ?? '';
        if ($titleAr !== '') {
            $section->addText($titleAr, ['rtl' => true]);
        }

        $section->addTextBreak(1);
        $meta = [];
        if (! empty($assembled['contract_metadata']['contract_value'])) {
            $meta[] = 'Value: ' . $assembled['contract_metadata']['contract_value'] . ' ' . ($assembled['contract_metadata']['currency'] ?? 'SAR');
        }
        if (! empty($assembled['contract_metadata']['start_date'])) {
            $meta[] = 'Start: ' . $assembled['contract_metadata']['start_date'];
        }
        if (! empty($assembled['contract_metadata']['end_date'])) {
            $meta[] = 'End: ' . $assembled['contract_metadata']['end_date'];
        }
        if ($meta !== []) {
            $section->addText(implode(' | ', $meta), ['size' => 9]);
        }

        $source = [];
        if (! empty($assembled['source_metadata']['project_name'])) {
            $source[] = 'Project: ' . $assembled['source_metadata']['project_name'] . (! empty($assembled['source_metadata']['project_code']) ? ' (' . $assembled['source_metadata']['project_code'] . ')' : '');
        }
        if (! empty($assembled['source_metadata']['supplier_name'])) {
            $source[] = 'Supplier: ' . $assembled['source_metadata']['supplier_name'] . (! empty($assembled['source_metadata']['supplier_code']) ? ' (' . $assembled['source_metadata']['supplier_code'] . ')' : '');
        }
        if (! empty($assembled['source_metadata']['rfq_number'])) {
            $source[] = 'RFQ: ' . $assembled['source_metadata']['rfq_number'] . (! empty($assembled['source_metadata']['rfq_title']) ? ' — ' . $assembled['source_metadata']['rfq_title'] : '');
        }
        if ($source !== []) {
            $section->addTextBreak(1);
            $section->addText(implode(' | ', $source), ['size' => 9]);
        }

        if ($assembled['generation_mode'] === 'signature_package' && ! empty($assembled['issue_package_metadata'])) {
            $pkg = $assembled['issue_package_metadata'];
            $section->addTextBreak(1);
            $section->addText('Signature package — Version ' . ($pkg['issue_version'] ?? '—') . ' (' . ($pkg['prepared_at'] ?? '') . ')', ['bold' => true]);
        }

        $section->addTextBreak(2);
        $section->addTitle('Articles', 2);

        $articleIndex = 0;
        foreach ($assembled['articles'] as $article) {
            $articleIndex++;
            $section->addTextBreak(1);
            $section->addText($article['article_code'] . ' — ' . $article['title_en'], ['bold' => true]);
            if (($article['title_ar'] ?? '') !== '') {
                $section->addText($article['title_ar'], ['rtl' => true]);
            }

            $segments = $article['block_segments'] ?? null;
            if (is_array($segments) && $segments !== []) {
                $blockNum = 0;
                foreach ($segments as $seg) {
                    $blockNum++;
                    $label = $articleIndex.'.'.$blockNum;
                    $section->addTextBreak(1);
                    $section->addText($label, ['bold' => true, 'size' => 10]);
                    if (($seg['rendered_en'] ?? '') !== '') {
                        $section->addText($seg['rendered_en']);
                    }
                    if (($seg['rendered_ar'] ?? '') !== '') {
                        $section->addText($seg['rendered_ar'], ['rtl' => true]);
                    }
                }
            } else {
                if (($article['rendered_content_en'] ?? '') !== '') {
                    $section->addText($article['rendered_content_en']);
                }
                if (($article['rendered_content_ar'] ?? '') !== '') {
                    $section->addText($article['rendered_content_ar'], ['rtl' => true]);
                }
            }
        }

        $fullPath = $storagePath . '/' . $fileName;
        $directory = dirname($fullPath);
        if ($directory !== '.' && $directory !== '' && $directory !== DIRECTORY_SEPARATOR) {
            Storage::disk('local')->makeDirectory($directory);
        }
        $tempFile = tempnam(sys_get_temp_dir(), 'contract_docx_');
        if ($tempFile === false) {
            throw new \RuntimeException('Failed to create temp file for DOCX.');
        }
        try {
            $objWriter = IOFactory::createWriter($phpWord, 'Word2007');
            $objWriter->save($tempFile);
            $content = (string) file_get_contents($tempFile);
            Storage::disk('local')->put($fullPath, $content);
            $size = strlen($content);
        } finally {
            @unlink($tempFile);
        }

        return [
            'file_path' => $fullPath,
            'file_name' => $fileName,
            'mime_type' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'file_size_bytes' => $size,
        ];
    }
}
