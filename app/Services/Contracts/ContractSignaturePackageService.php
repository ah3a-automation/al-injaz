<?php

declare(strict_types=1);

namespace App\Services\Contracts;

use App\Models\Contract;
use App\Models\ContractIssuePackage;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use RuntimeException;

final class ContractSignaturePackageService
{
    /**
     * @return array{is_ready: bool, issues: array<int, string>}
     */
    public function checkReadiness(Contract $contract): array
    {
        $issues = [];

        if (! $contract->isApprovedForSignature()) {
            $issues[] = __('contracts.execution.eligibility.signature_not_approved_for_signature');
        }

        if ($contract->isCancelled()) {
            $issues[] = __('contracts.execution.eligibility.signature_contract_cancelled');
        }

        if ($contract->isSignaturePackageIssued()) {
            $issues[] = __('contracts.execution.eligibility.signature_package_already_issued');
        }

        if ($contract->supplier === null) {
            $issues[] = __('contracts.execution.eligibility.signature_no_supplier');
        }

        if ($contract->rfq === null) {
            $issues[] = __('contracts.execution.eligibility.signature_missing_rfq');
        }

        if ($contract->contract_number === null || $contract->contract_number === '') {
            $issues[] = __('contracts.execution.eligibility.signature_contract_number_missing');
        }

        if ($contract->draftArticles()->count() === 0) {
            $issues[] = __('contracts.execution.eligibility.signature_no_draft_articles');
        }

        if ($contract->hasUnresolvedMergeFields()) {
            $issues[] = __('contracts.execution.eligibility.signature_unresolved_merge_fields');
        }

        return [
            'is_ready' => $issues === [],
            'issues' => $issues,
        ];
    }

    public function issueSignaturePackage(Contract $contract, User $actor, ?string $notes = null): ContractIssuePackage
    {
        $readiness = $this->checkReadiness($contract);

        if (! $readiness['is_ready']) {
            throw new RuntimeException(implode(' ', $readiness['issues']));
        }

        return DB::transaction(function () use ($contract, $actor, $notes): ContractIssuePackage {
            $nextVersion = $this->nextIssueVersion($contract);

            ContractIssuePackage::query()
                ->where('contract_id', $contract->id)
                ->where('package_status', ContractIssuePackage::PACKAGE_STATUS_ISSUED)
                ->update(['package_status' => ContractIssuePackage::PACKAGE_STATUS_SUPERSEDED]);

            $articleCount = (int) $contract->draftArticles()->count();

            $package = new ContractIssuePackage();
            $package->fill([
                'contract_id' => $contract->id,
                'issue_version' => $nextVersion,
                'package_status' => ContractIssuePackage::PACKAGE_STATUS_ISSUED,
                'prepared_by_user_id' => $actor->id,
                'prepared_at' => now(),
                'notes' => $notes,
                'snapshot_contract_status' => $contract->status,
                'snapshot_contract_title_en' => $contract->title_en,
                'snapshot_contract_title_ar' => $contract->title_ar,
                'snapshot_supplier_name' => $contract->supplier?->legal_name_en,
                'snapshot_contract_number' => $contract->contract_number,
                'snapshot_article_count' => $articleCount,
            ]);
            $package->save();

            $contract->status = Contract::STATUS_SIGNATURE_PACKAGE_ISSUED;
            $contract->is_locked_for_signature = true;
            $contract->finalized_for_signature_at = now();
            $contract->finalized_for_signature_by_user_id = $actor->id;
            $contract->current_issue_package_id = $package->id;
            $contract->save();

            return $package;
        });
    }

    public function nextIssueVersion(Contract $contract): int
    {
        /** @var int|null $max */
        $max = ContractIssuePackage::query()
            ->where('contract_id', $contract->id)
            ->max('issue_version');

        return $max === null ? 1 : $max + 1;
    }
}

