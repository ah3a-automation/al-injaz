<?php

declare(strict_types=1);

namespace App\Services\Contracts;

use App\Models\Contract;
use App\Models\ContractVariation;
use App\Models\User;
use App\Services\System\OutboxService;
use RuntimeException;

final class ContractVariationService
{
    public function __construct(
        private readonly OutboxService $outboxService
    ) {}
    /**
     * @return array{is_ready: bool, issues: array<int, string>}
     */
    public function checkVariationEligibility(Contract $contract): array
    {
        $issues = [];

        if ($contract->status !== Contract::STATUS_EXECUTED) {
            $issues[] = 'Contract must be executed to manage variations.';
        }
        if ($contract->administration_status !== Contract::ADMIN_STATUS_INITIALIZED) {
            $issues[] = 'Administration baseline must be initialized before managing variations.';
        }

        return [
            'is_ready' => $issues === [],
            'issues' => $issues,
        ];
    }

    /**
     * @param array{title: string, variation_type: string, reason?: string|null, description?: string|null, commercial_delta?: float|string|null, currency?: string|null, time_delta_days?: int|null} $payload
     */
    public function createVariation(Contract $contract, array $payload, User $actor): ContractVariation
    {
        $eligibility = $this->checkVariationEligibility($contract);
        if (! $eligibility['is_ready']) {
            throw new RuntimeException(implode(' ', $eligibility['issues']));
        }

        $variationNo = $this->nextVariationNumber($contract);
        $commercialDelta = isset($payload['commercial_delta'])
            ? (is_numeric($payload['commercial_delta']) ? (float) $payload['commercial_delta'] : null)
            : null;
        $timeDeltaDays = isset($payload['time_delta_days']) ? (int) $payload['time_delta_days'] : 0;

        $variation = new ContractVariation();
        $variation->contract_id = $contract->id;
        $variation->variation_no = $variationNo;
        $variation->title = $payload['title'];
        $variation->variation_type = $payload['variation_type'];
        $variation->status = ContractVariation::STATUS_DRAFT;
        $variation->reason = $payload['reason'] ?? null;
        $variation->description = $payload['description'] ?? null;
        $variation->commercial_delta = $commercialDelta;
        $variation->currency = $payload['currency'] ?? $contract->currency ?? null;
        $variation->time_delta_days = $timeDeltaDays;
        $variation->requested_by = $actor->id;
        $variation->created_by_user_id = $actor->id;
        $variation->updated_by_user_id = $actor->id;
        $variation->save();

        $this->refreshContractVariationSummary($contract);

        return $variation;
    }

    public function submitVariation(ContractVariation $variation, User $actor): ContractVariation
    {
        if ($variation->status !== ContractVariation::STATUS_DRAFT) {
            throw new RuntimeException('Variation must be in draft to submit.');
        }

        $variation->status = ContractVariation::STATUS_SUBMITTED;
        $variation->submitted_at = now();
        $variation->submitted_by_user_id = $actor->id;
        $variation->updated_by_user_id = $actor->id;
        $variation->save();

        $this->refreshContractVariationSummary($variation->contract);

        return $variation;
    }

    public function approveVariation(ContractVariation $variation, User $actor, ?string $notes = null): ContractVariation
    {
        if ($variation->status !== ContractVariation::STATUS_SUBMITTED) {
            throw new RuntimeException('Variation must be submitted to approve.');
        }

        $variation->status = ContractVariation::STATUS_APPROVED;
        $variation->approved_at = now();
        $variation->approved_by_user_id = $actor->id;
        $variation->rejected_at = null;
        $variation->rejected_by_user_id = null;
        $variation->decision_notes = $notes;
        $variation->updated_by_user_id = $actor->id;
        $variation->save();

        $this->refreshContractVariationSummary($variation->contract);

        $this->outboxService->record('contract.variation_approved', 'contract_variation', $variation->id, [
            'contract_id' => $variation->contract_id,
            'variation_id' => $variation->id,
            'amount_delta' => (float) ($variation->commercial_delta ?? 0),
            'time_delta_days' => (int) ($variation->time_delta_days ?? 0),
        ]);

        return $variation;
    }

    public function rejectVariation(ContractVariation $variation, User $actor, ?string $notes = null): ContractVariation
    {
        if ($variation->status !== ContractVariation::STATUS_SUBMITTED) {
            throw new RuntimeException('Variation must be submitted to reject.');
        }

        $variation->status = ContractVariation::STATUS_REJECTED;
        $variation->rejected_at = now();
        $variation->rejected_by_user_id = $actor->id;
        $variation->approved_at = null;
        $variation->approved_by_user_id = null;
        $variation->decision_notes = $notes;
        $variation->updated_by_user_id = $actor->id;
        $variation->save();

        $this->refreshContractVariationSummary($variation->contract);

        return $variation;
    }

    public function refreshContractVariationSummary(Contract $contract): Contract
    {
        $contract->refresh();
        $variations = $contract->variations()->get();

        $approved = $variations->where('status', ContractVariation::STATUS_APPROVED);
        $totalApproved = $approved->sum(fn (ContractVariation $v) => (float) ($v->commercial_delta ?? 0));
        $daysApproved = $approved->sum(fn (ContractVariation $v) => (int) ($v->time_delta_days ?? 0));

        $contract->variation_count_total = $variations->count();
        $contract->variation_count_approved = $approved->count();
        $contract->variation_total_approved = $totalApproved;
        $contract->variation_days_total_approved = $daysApproved;
        $contract->save();

        return $contract;
    }

    public function nextVariationNumber(Contract $contract): string
    {
        // Query ContractVariation directly: the variations() relation adds orderBy('variation_no'),
        // which breaks PostgreSQL when combined with aggregate SELECT (GROUP BY error).
        $maxNo = ContractVariation::query()
            ->where('contract_id', $contract->id)
            ->selectRaw("COALESCE(MAX(CAST(SUBSTRING(variation_no FROM 4) AS INTEGER)), 0) AS n")
            ->value('n');

        if ($maxNo === null) {
            $maxNo = 0;
        }
        $next = (int) $maxNo + 1;

        return 'VO-' . str_pad((string) $next, 3, '0', STR_PAD_LEFT);
    }
}
