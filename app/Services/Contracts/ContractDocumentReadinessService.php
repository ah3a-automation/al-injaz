<?php

declare(strict_types=1);

namespace App\Services\Contracts;

use App\Models\Contract;

/**
 * Determines whether contract documents and signature-package documents can be generated.
 */
final class ContractDocumentReadinessService
{
    /**
     * Readiness for contract DOCX/PDF (from current draft rendered content).
     *
     * @return array{is_ready: bool, issues: array<int, string>}
     */
    public function checkContractDocumentReadiness(Contract $contract): array
    {
        $issues = [];

        if ($contract->hasUnresolvedMergeFields()) {
            $issues[] = 'Contract has unresolved merge fields. Resolve or provide manual overrides, then run Preview render.';
        }

        if ($contract->draftArticles()->count() === 0) {
            $issues[] = 'Contract has no draft articles.';
        }

        return [
            'is_ready' => $issues === [],
            'issues' => $issues,
        ];
    }

    /**
     * Readiness for signature package DOCX/PDF (tied to current issue package).
     *
     * @return array{is_ready: bool, issues: array<int, string>}
     */
    public function checkSignaturePackageDocumentReadiness(Contract $contract): array
    {
        $issues = [];

        if ($contract->hasUnresolvedMergeFields()) {
            $issues[] = 'Contract has unresolved merge fields. Resolve or provide manual overrides, then run Preview render.';
        }

        if ($contract->draftArticles()->count() === 0) {
            $issues[] = 'Contract has no draft articles.';
        }

        if ($contract->current_issue_package_id === null) {
            $issues[] = 'Contract has no current issue package. Issue a signature package first.';
        }

        $package = $contract->currentIssuePackage;
        if ($package === null && $contract->current_issue_package_id !== null) {
            $issues[] = 'Current issue package not found.';
        }

        if (! $contract->is_locked_for_signature && $contract->status !== Contract::STATUS_SIGNATURE_PACKAGE_ISSUED) {
            if ($contract->current_issue_package_id !== null) {
                $issues[] = 'Contract is not in signature-package context.';
            }
        }

        return [
            'is_ready' => $issues === [],
            'issues' => $issues,
        ];
    }
}
