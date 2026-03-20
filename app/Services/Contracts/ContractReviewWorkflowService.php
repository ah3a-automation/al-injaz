<?php

declare(strict_types=1);

namespace App\Services\Contracts;

use App\Models\Contract;
use App\Models\ContractReview;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use RuntimeException;

final class ContractReviewWorkflowService
{
    public function submitForReview(Contract $contract, User $actor): Contract
    {
        if ($contract->status !== Contract::STATUS_READY_FOR_REVIEW) {
            throw new RuntimeException('Contract is not ready to be submitted for review.');
        }

        return DB::transaction(function () use ($contract, $actor): Contract {
            $contract->status = Contract::STATUS_IN_LEGAL_REVIEW;
            $contract->submitted_for_review_at = now();
            $contract->submitted_for_review_by_user_id = $actor->id;
            $contract->review_return_reason = null;
            $contract->save();

            return $contract;
        });
    }

    public function recordStageDecision(
        Contract $contract,
        string $stage,
        string $decision,
        ?string $notes,
        User $actor
    ): Contract {
        if (! in_array($decision, ['approved', 'rejected', 'returned_for_rework'], true)) {
            throw new RuntimeException('Invalid review decision.');
        }

        $currentStage = $this->inferStageFromStatus($contract->status);

        if ($currentStage === null) {
            throw new RuntimeException('Contract is not currently in a review stage.');
        }

        if ($stage !== $currentStage) {
            throw new RuntimeException('Contract is not currently in this review stage.');
        }

        $fromStatus = $contract->status;
        $toStatus = $this->nextStatusForDecision($fromStatus, $decision);

        if ($toStatus === $fromStatus) {
            return $contract;
        }

        return DB::transaction(function () use ($contract, $stage, $decision, $notes, $actor, $fromStatus, $toStatus): Contract {
            $review = new ContractReview();
            $review->fill([
                'contract_id' => $contract->id,
                'review_stage' => $stage,
                'decision' => $decision,
                'from_status' => $fromStatus,
                'to_status' => $toStatus,
                'review_notes' => $notes,
                'decision_by_user_id' => $actor->id,
            ]);
            $review->save();

            $contract->status = $toStatus;

            if ($decision === 'approved') {
                if ($toStatus === Contract::STATUS_APPROVED_FOR_SIGNATURE) {
                    $contract->review_completed_at = now();
                    $contract->review_completed_by_user_id = $actor->id;
                    if ($notes !== null && $notes !== '') {
                        $contract->approval_summary = $notes;
                    }
                }
            } else {
                $contract->review_return_reason = $notes;
            }

            $contract->save();

            return $contract;
        });
    }

    private function nextStatusForDecision(string $current, string $decision): string
    {
        if ($decision === 'approved') {
            return match ($current) {
                Contract::STATUS_READY_FOR_REVIEW => Contract::STATUS_IN_LEGAL_REVIEW,
                Contract::STATUS_IN_LEGAL_REVIEW => Contract::STATUS_IN_COMMERCIAL_REVIEW,
                Contract::STATUS_IN_COMMERCIAL_REVIEW => Contract::STATUS_IN_MANAGEMENT_REVIEW,
                Contract::STATUS_IN_MANAGEMENT_REVIEW => Contract::STATUS_APPROVED_FOR_SIGNATURE,
                default => $current,
            };
        }

        if (in_array($decision, ['rejected', 'returned_for_rework'], true)) {
            return Contract::STATUS_RETURNED_FOR_REWORK;
        }

        return $current;
    }

    private function inferStageFromStatus(string $status): ?string
    {
        return match ($status) {
            Contract::STATUS_IN_LEGAL_REVIEW => 'legal',
            Contract::STATUS_IN_COMMERCIAL_REVIEW => 'commercial',
            Contract::STATUS_IN_MANAGEMENT_REVIEW => 'management',
            default => null,
        };
    }
}

