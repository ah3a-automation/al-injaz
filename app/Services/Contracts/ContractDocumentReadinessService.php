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
            $issues[] = __('contracts.execution.eligibility.document_unresolved_merge_fields');
        }

        if ($contract->draftArticles()->count() === 0) {
            $issues[] = __('contracts.execution.eligibility.document_no_draft_articles');
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
            $issues[] = __('contracts.execution.eligibility.document_unresolved_merge_fields');
        }

        if ($contract->draftArticles()->count() === 0) {
            $issues[] = __('contracts.execution.eligibility.document_no_draft_articles');
        }

        if ($contract->current_issue_package_id === null) {
            $issues[] = __('contracts.execution.eligibility.document_no_issue_package');
        }

        $package = $contract->currentIssuePackage;
        if ($package === null && $contract->current_issue_package_id !== null) {
            $issues[] = __('contracts.execution.eligibility.document_issue_package_not_found');
        }

        if (! $contract->is_locked_for_signature && $contract->status !== Contract::STATUS_SIGNATURE_PACKAGE_ISSUED) {
            if ($contract->current_issue_package_id !== null) {
                $issues[] = __('contracts.execution.eligibility.document_not_signature_context');
            }
        }

        return [
            'is_ready' => $issues === [],
            'issues' => $issues,
        ];
    }
}
