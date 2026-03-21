<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Rfq;
use App\Models\User;

class RfqPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('rfq.view');
    }

    public function view(User $user, Rfq $rfq): bool
    {
        return $user->can('rfq.view');
    }

    public function create(User $user): bool
    {
        return $user->can('rfq.create');
    }

    public function update(User $user, Rfq $rfq): bool
    {
        return $rfq->status === Rfq::STATUS_DRAFT && $user->can('rfq.create');
    }

    public function issue(User $user, Rfq $rfq): bool
    {
        return $rfq->status === Rfq::STATUS_DRAFT && $user->can('rfq.issue');
    }

    public function markResponsesReceived(User $user, Rfq $rfq): bool
    {
        return in_array($rfq->status, [Rfq::STATUS_ISSUED, Rfq::STATUS_RESPONSES_RECEIVED], true)
            && $user->can('rfq.evaluate');
    }

    public function evaluate(User $user, Rfq $rfq): bool
    {
        return $rfq->status === Rfq::STATUS_RESPONSES_RECEIVED && $user->can('rfq.evaluate');
    }

    public function evaluateSupplier(User $user, Rfq $rfq): bool
    {
        return in_array($rfq->status, [Rfq::STATUS_UNDER_EVALUATION, Rfq::STATUS_RECOMMENDED], true)
            && $user->can('rfq.evaluate');
    }

    public function award(User $user, Rfq $rfq): bool
    {
        return $rfq->status === Rfq::STATUS_RECOMMENDED && $user->can('rfq.award');
    }

    public function createContract(User $user, Rfq $rfq): bool
    {
        return $rfq->status === Rfq::STATUS_AWARDED && $user->can('rfq.create');
    }

    public function close(User $user, Rfq $rfq): bool
    {
        return in_array($rfq->status, [Rfq::STATUS_AWARDED, Rfq::STATUS_UNDER_EVALUATION], true) && $user->can('rfq.close');
    }

    public function delete(User $user, Rfq $rfq): bool
    {
        return $rfq->status === Rfq::STATUS_DRAFT && $user->can('rfq.create');
    }

    public function approve(User $user, Rfq $rfq): bool
    {
        return $user->can('rfq.issue');
    }

    /**
     * Approve or reject the RFQ document in the pre-issue workflow (same gate as {@see approve()}).
     */
    public function approveRfq(User $user, Rfq $rfq): bool
    {
        return $this->approve($user, $rfq);
    }

    /**
     * Save or update supplier recommendation on the comparison page (post-issue lifecycle only).
     *
     * @see self::update() Draft RFQ field edits remain gated by {@see update()}.
     */
    public function recommend(User $user, Rfq $rfq): bool
    {
        return $this->recommendationPhaseStatuses($rfq->status)
            && $user->can('rfq.evaluate');
    }

    /**
     * Formal “submit recommendation for approval” step after recommendation_status is submitted.
     */
    public function submitRecommendationForApproval(User $user, Rfq $rfq): bool
    {
        return $this->recommend($user, $rfq)
            && $rfq->canSubmitRecommendationForApproval();
    }

    /**
     * Submit draft RFQ for internal approval before issue.
     */
    public function submitRfqForApproval(User $user, Rfq $rfq): bool
    {
        return $rfq->status === Rfq::STATUS_DRAFT
            && $rfq->canSubmitRfqForApproval()
            && $user->can('rfq.create');
    }

    public function approveRecommendation(User $user, Rfq $rfq): bool
    {
        return $user->can('rfq.award') || $user->can('rfq.evaluate');
    }

    /** Statuses where quotation comparison / recommendation notes apply (strictest usable band). */
    private function recommendationPhaseStatuses(string $status): bool
    {
        return in_array($status, [
            Rfq::STATUS_ISSUED,
            Rfq::STATUS_SUPPLIER_QUESTIONS,
            Rfq::STATUS_RESPONSES_RECEIVED,
            Rfq::STATUS_UNDER_EVALUATION,
            Rfq::STATUS_RECOMMENDED,
        ], true);
    }
}
