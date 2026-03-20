<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Contract;
use App\Services\ActivityLogger;
use App\Services\Contracts\ContractDocumentGenerationService;
use App\Services\Contracts\ContractDocumentReadinessService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

final class ContractDocumentController extends Controller
{
    public function __construct(
        private readonly ContractDocumentGenerationService $generationService,
        private readonly ContractDocumentReadinessService $readinessService,
        private readonly ActivityLogger $activityLogger,
    ) {
    }

    public function generateContractDocx(Request $request, Contract $contract): RedirectResponse
    {
        $this->authorize('update', $contract);

        try {
            $doc = $this->generationService->generateContractDocx($contract, $request->user());
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        $this->activityLogger->log('contracts.contract.document_generated', $contract, [], [
            'generated_document_id' => $doc->id,
            'document_type' => $doc->document_type,
            'generation_source' => $doc->generation_source,
        ], $request->user());

        return back()->with('success', __('contracts.documents.generated_docx'));
    }

    public function generateContractPdf(Request $request, Contract $contract): RedirectResponse
    {
        $this->authorize('update', $contract);

        try {
            $doc = $this->generationService->generateContractPdf($contract, $request->user());
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        $this->activityLogger->log('contracts.contract.document_generated', $contract, [], [
            'generated_document_id' => $doc->id,
            'document_type' => $doc->document_type,
            'generation_source' => $doc->generation_source,
        ], $request->user());

        return back()->with('success', __('contracts.documents.generated_pdf'));
    }

    public function generateSignaturePackageDocx(Request $request, Contract $contract): RedirectResponse
    {
        $this->authorize('update', $contract);

        try {
            $doc = $this->generationService->generateSignaturePackageDocx($contract, $request->user());
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        $this->activityLogger->log('contracts.contract.document_generated', $contract, [], [
            'generated_document_id' => $doc->id,
            'document_type' => $doc->document_type,
            'generation_source' => $doc->generation_source,
            'issue_version' => $doc->snapshot_issue_version,
        ], $request->user());

        return back()->with('success', __('contracts.documents.generated_signature_docx'));
    }

    public function generateSignaturePackagePdf(Request $request, Contract $contract): RedirectResponse
    {
        $this->authorize('update', $contract);

        try {
            $doc = $this->generationService->generateSignaturePackagePdf($contract, $request->user());
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        $this->activityLogger->log('contracts.contract.document_generated', $contract, [], [
            'generated_document_id' => $doc->id,
            'document_type' => $doc->document_type,
            'generation_source' => $doc->generation_source,
            'issue_version' => $doc->snapshot_issue_version,
        ], $request->user());

        return back()->with('success', __('contracts.documents.generated_signature_pdf'));
    }

    public function download(Request $request, Contract $contract, string $document): StreamedResponse|RedirectResponse
    {
        $this->authorize('view', $contract);

        $doc = $contract->generatedDocuments()->find($document);
        if ($doc === null) {
            return back()->with('error', __('contracts.documents.not_found'));
        }

        if (! Storage::disk('local')->exists($doc->file_path)) {
            return back()->with('error', __('contracts.documents.file_missing'));
        }

        return Storage::disk('local')->download($doc->file_path, $doc->file_name, [
            'Content-Type' => $doc->mime_type,
        ]);
    }
}
