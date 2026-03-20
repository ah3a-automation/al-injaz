<?php

declare(strict_types=1);

namespace App\Services\Contracts;

use App\Models\Contract;
use App\Models\ContractGeneratedDocument;
use App\Models\User;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

/**
 * Orchestrates readiness, assembly, DOCX/PDF generation, and persistence of contract generated documents.
 */
final class ContractDocumentGenerationService
{
    public function __construct(
        private readonly ContractDocumentReadinessService $readinessService,
        private readonly ContractDocumentAssembler $assembler,
        private readonly ContractDraftRenderingService $renderingService,
        private readonly ContractDocxGenerator $docxGenerator,
        private readonly ContractPdfGenerator $pdfGenerator,
    ) {
    }

    /**
     * Generate contract DOCX (from current draft rendered content).
     */
    public function generateContractDocx(Contract $contract, User $actor): ContractGeneratedDocument
    {
        $readiness = $this->readinessService->checkContractDocumentReadiness($contract);
        if (! $readiness['is_ready']) {
            throw new RuntimeException(implode(' ', $readiness['issues']));
        }

        $this->renderingService->renderAll($contract);
        $assembled = $this->assembler->assembleForDraft($contract);

        $storagePath = 'contracts/' . $contract->id . '/generated';
        $safeNumber = preg_replace('/[^a-zA-Z0-9_-]/', '_', $contract->contract_number ?? $contract->id);
        $fileName = 'contract-' . $safeNumber . '-docx-' . now()->format('Y-m-d-His') . '.docx';

        $result = $this->docxGenerator->generate($assembled, $storagePath, $fileName);

        return $this->persistDocument($contract, null, ContractGeneratedDocument::TYPE_CONTRACT_DOCX, $result, ContractGeneratedDocument::SOURCE_DRAFT, $actor);
    }

    /**
     * Generate contract PDF (from current draft rendered content).
     */
    public function generateContractPdf(Contract $contract, User $actor): ContractGeneratedDocument
    {
        $readiness = $this->readinessService->checkContractDocumentReadiness($contract);
        if (! $readiness['is_ready']) {
            throw new RuntimeException(implode(' ', $readiness['issues']));
        }

        $this->renderingService->renderAll($contract);
        $assembled = $this->assembler->assembleForDraft($contract);

        $storagePath = 'contracts/' . $contract->id . '/generated';
        $safeNumber = preg_replace('/[^a-zA-Z0-9_-]/', '_', $contract->contract_number ?? $contract->id);
        $fileName = 'contract-' . $safeNumber . '-pdf-' . now()->format('Y-m-d-His') . '.pdf';

        $result = $this->pdfGenerator->generate($assembled, $storagePath, $fileName);

        return $this->persistDocument($contract, null, ContractGeneratedDocument::TYPE_CONTRACT_PDF, $result, ContractGeneratedDocument::SOURCE_DRAFT, $actor);
    }

    /**
     * Generate signature package DOCX (tied to current issue package).
     */
    public function generateSignaturePackageDocx(Contract $contract, User $actor): ContractGeneratedDocument
    {
        $readiness = $this->readinessService->checkSignaturePackageDocumentReadiness($contract);
        if (! $readiness['is_ready']) {
            throw new RuntimeException(implode(' ', $readiness['issues']));
        }

        $package = $contract->currentIssuePackage;
        if ($package === null) {
            throw new RuntimeException('Contract has no current issue package.');
        }

        $this->renderingService->renderAll($contract);
        $assembled = $this->assembler->assembleForSignaturePackage($contract);

        $storagePath = 'contracts/' . $contract->id . '/generated';
        $safeNumber = preg_replace('/[^a-zA-Z0-9_-]/', '_', $contract->contract_number ?? $contract->id);
        $fileName = 'signature-package-' . $safeNumber . '-v' . $package->issue_version . '-docx-' . now()->format('Y-m-d-His') . '.docx';

        $result = $this->docxGenerator->generate($assembled, $storagePath, $fileName);

        return $this->persistDocument($contract, $package->id, ContractGeneratedDocument::TYPE_SIGNATURE_PACKAGE_DOCX, $result, ContractGeneratedDocument::SOURCE_SIGNATURE_PACKAGE, $actor, $package->issue_version);
    }

    /**
     * Generate signature package PDF (tied to current issue package).
     */
    public function generateSignaturePackagePdf(Contract $contract, User $actor): ContractGeneratedDocument
    {
        $readiness = $this->readinessService->checkSignaturePackageDocumentReadiness($contract);
        if (! $readiness['is_ready']) {
            throw new RuntimeException(implode(' ', $readiness['issues']));
        }

        $package = $contract->currentIssuePackage;
        if ($package === null) {
            throw new RuntimeException('Contract has no current issue package.');
        }

        $this->renderingService->renderAll($contract);
        $assembled = $this->assembler->assembleForSignaturePackage($contract);

        $storagePath = 'contracts/' . $contract->id . '/generated';
        $safeNumber = preg_replace('/[^a-zA-Z0-9_-]/', '_', $contract->contract_number ?? $contract->id);
        $fileName = 'signature-package-' . $safeNumber . '-v' . $package->issue_version . '-pdf-' . now()->format('Y-m-d-His') . '.pdf';

        $result = $this->pdfGenerator->generate($assembled, $storagePath, $fileName);

        return $this->persistDocument($contract, $package->id, ContractGeneratedDocument::TYPE_SIGNATURE_PACKAGE_PDF, $result, ContractGeneratedDocument::SOURCE_SIGNATURE_PACKAGE, $actor, $package->issue_version);
    }

    /**
     * @param  array{file_path: string, file_name: string, mime_type: string, file_size_bytes: int|null}  $result
     */
    private function persistDocument(
        Contract $contract,
        ?string $issuePackageId,
        string $documentType,
        array $result,
        string $generationSource,
        User $actor,
        ?int $snapshotIssueVersion = null
    ): ContractGeneratedDocument {
        $doc = new ContractGeneratedDocument();
        $doc->contract_id = $contract->id;
        $doc->contract_issue_package_id = $issuePackageId;
        $doc->document_type = $documentType;
        $doc->file_name = $result['file_name'];
        $doc->file_path = $result['file_path'];
        $doc->mime_type = $result['mime_type'];
        $doc->file_size_bytes = $result['file_size_bytes'] ?? null;
        $doc->generation_source = $generationSource;
        $doc->snapshot_contract_status = $contract->status;
        $doc->snapshot_issue_version = $snapshotIssueVersion;
        $doc->generated_by_user_id = $actor->id;
        $doc->generated_at = now();
        $doc->save();

        return $doc;
    }
}
