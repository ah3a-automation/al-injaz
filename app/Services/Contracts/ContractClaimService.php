<?php

declare(strict_types=1);

namespace App\Services\Contracts;

use App\Models\Contract;
use App\Models\ContractClaim;
use App\Models\User;
use RuntimeException;

final class ContractClaimService
{
    /**
     * @return array{is_ready: bool, issues: array<int, string>}
     */
    public function checkClaimEligibility(Contract $contract): array
    {
        $issues = [];
        if ($contract->status !== Contract::STATUS_EXECUTED) {
            $issues[] = __('contracts.execution.eligibility.executed_for_claims');
        }
        if ($contract->administration_status !== Contract::ADMIN_STATUS_INITIALIZED) {
            $issues[] = __('contracts.execution.eligibility.administration_for_claims');
        }
        return ['is_ready' => $issues === [], 'issues' => $issues];
    }

    /**
     * @param array{title: string, description?: string|null, notes?: string|null} $payload
     */
    public function createClaim(Contract $contract, array $payload, User $actor): ContractClaim
    {
        $eligibility = $this->checkClaimEligibility($contract);
        if (! $eligibility['is_ready']) {
            throw new RuntimeException(implode(' ', $eligibility['issues']));
        }
        $claim = new ContractClaim();
        $claim->contract_id = $contract->id;
        $claim->claim_no = $this->nextClaimNumber($contract);
        $claim->title = $payload['title'];
        $claim->description = $payload['description'] ?? null;
        $claim->notes = $payload['notes'] ?? null;
        $claim->status = ContractClaim::STATUS_DRAFT;
        $claim->created_by_user_id = $actor->id;
        $claim->updated_by_user_id = $actor->id;
        $claim->save();
        return $claim;
    }

    /**
     * @param array{title?: string, description?: string|null, notes?: string|null} $payload
     */
    public function updateDraftClaim(ContractClaim $claim, array $payload, User $actor): ContractClaim
    {
        if ($claim->status !== ContractClaim::STATUS_DRAFT) {
            throw new RuntimeException(__('contracts.execution.errors.claim_only_draft_updatable'));
        }
        if (isset($payload['title'])) {
            $claim->title = $payload['title'];
        }
        if (array_key_exists('description', $payload)) {
            $claim->description = $payload['description'];
        }
        if (array_key_exists('notes', $payload)) {
            $claim->notes = $payload['notes'];
        }
        $claim->updated_by_user_id = $actor->id;
        $claim->save();
        return $claim;
    }

    public function submitClaim(ContractClaim $claim, User $actor): ContractClaim
    {
        if ($claim->status !== ContractClaim::STATUS_DRAFT) {
            throw new RuntimeException(__('contracts.execution.errors.claim_only_draft_submittable'));
        }
        $claim->status = ContractClaim::STATUS_SUBMITTED;
        $claim->submitted_at = now();
        $claim->updated_by_user_id = $actor->id;
        $claim->save();
        return $claim;
    }

    public function moveToUnderReview(ContractClaim $claim, User $actor): ContractClaim
    {
        if ($claim->status !== ContractClaim::STATUS_SUBMITTED) {
            throw new RuntimeException(__('contracts.execution.errors.claim_only_submitted_to_review'));
        }
        $claim->status = ContractClaim::STATUS_UNDER_REVIEW;
        $claim->updated_by_user_id = $actor->id;
        $claim->save();
        return $claim;
    }

    public function resolveClaim(ContractClaim $claim, User $actor): ContractClaim
    {
        if ($claim->status !== ContractClaim::STATUS_UNDER_REVIEW) {
            throw new RuntimeException(__('contracts.execution.errors.claim_only_under_review_resolvable'));
        }
        $claim->status = ContractClaim::STATUS_RESOLVED;
        $claim->resolved_at = now();
        $claim->updated_by_user_id = $actor->id;
        $claim->save();
        return $claim;
    }

    public function rejectClaim(ContractClaim $claim, User $actor): ContractClaim
    {
        if (! in_array($claim->status, [ContractClaim::STATUS_SUBMITTED, ContractClaim::STATUS_UNDER_REVIEW], true)) {
            throw new RuntimeException(__('contracts.execution.errors.claim_only_submitted_or_review_rejectable'));
        }
        $claim->status = ContractClaim::STATUS_REJECTED;
        $claim->rejected_at = now();
        $claim->updated_by_user_id = $actor->id;
        $claim->save();
        return $claim;
    }

    public function nextClaimNumber(Contract $contract): string
    {
        $maxNo = $contract->claims()
            ->whereRaw("claim_no ~ '^CLAIM-[0-9]+$'")
            ->selectRaw("COALESCE(MAX(CAST(SUBSTRING(claim_no FROM 7) AS INTEGER)), 0) AS n")
            ->value('n');
        $next = (int) ($maxNo ?? 0) + 1;
        return 'CLAIM-' . str_pad((string) $next, 3, '0', STR_PAD_LEFT);
    }
}
