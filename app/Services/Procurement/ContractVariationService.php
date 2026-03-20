<?php

declare(strict_types=1);

namespace App\Services\Procurement;

use App\Models\Contract;
use App\Models\ContractVariation;
use App\Models\User;
use App\Services\System\OutboxService;
use DomainException;
use RuntimeException;

final class ContractVariationService
{
    public function __construct(
        private readonly OutboxService $outboxService
    ) {}

    public function createVariation(
        Contract $contract,
        User $actor,
        string $title,
        string $type,
        float $amountDelta,
        int $timeDeltaDays,
        ?string $description = null
    ): ContractVariation {
        $this->assertVariationType($type);

        $variationNo = ($contract->variations()->max('variation_no') ?? 0) + 1;

        $variation = $contract->variations()->create([
            'variation_no'     => $variationNo,
            'title'           => $title,
            'description'     => $description,
            'variation_type'  => $type,
            'amount_delta'    => $amountDelta,
            'time_delta_days' => $timeDeltaDays,
            'status'          => ContractVariation::STATUS_DRAFT,
            'requested_by'    => $actor->id,
        ]);

        $this->logVariationActivity($contract, $variation, 'contract_variation_created', $actor);

        return $variation;
    }

    public function submitVariation(ContractVariation $variation): void
    {
        $this->assertStatus($variation, ContractVariation::STATUS_DRAFT);
        $variation->update(['status' => ContractVariation::STATUS_SUBMITTED]);
        $this->logVariationActivity($variation->contract, $variation, 'contract_variation_submitted', $variation->requestedBy);
    }

    public function approveVariation(ContractVariation $variation, User $approver): void
    {
        $this->assertStatus($variation, ContractVariation::STATUS_SUBMITTED);

        $contract = $variation->contract;
        $currentValue = $contract->getCurrentContractValue();
        $newValue = $currentValue + (float) $variation->amount_delta;
        if ($newValue < 0) {
            throw new DomainException(
                'Cannot approve variation: contract value would become negative. ' .
                "Current value: {$currentValue}, variation delta: {$variation->amount_delta}, result: {$newValue}."
            );
        }

        $variation->update([
            'status'      => ContractVariation::STATUS_APPROVED,
            'approved_by'  => $approver->id,
            'approved_at'  => now(),
        ]);
        $this->logVariationActivity($variation->contract, $variation, 'contract_variation_approved', $approver);

        $this->outboxService->record('contract.variation_approved', 'contract_variation', $variation->id, [
            'contract_id'     => $variation->contract_id,
            'variation_id'    => $variation->id,
            'amount_delta'    => $variation->amount_delta,
            'time_delta_days' => $variation->time_delta_days,
        ]);
    }

    public function rejectVariation(ContractVariation $variation, User $approver): void
    {
        $this->assertStatus($variation, ContractVariation::STATUS_SUBMITTED);
        $variation->update(['status' => ContractVariation::STATUS_REJECTED]);
        $this->logVariationActivity($variation->contract, $variation, 'contract_variation_rejected', $approver);
    }

    /**
     * @deprecated Phase 12 variation workflow has no "implemented" status. Use approved only.
     */
    public function implementVariation(ContractVariation $variation): void
    {
        throw new RuntimeException(
            'Variation "implement" is not part of Phase 12 workflow. Only draft, submitted, approved, rejected are used.'
        );
    }

    private function assertVariationType(string $type): void
    {
        if (! in_array($type, ContractVariation::TYPES, true)) {
            throw new RuntimeException("Invalid variation type: {$type}.");
        }
    }

    private function assertStatus(ContractVariation $variation, string $required): void
    {
        if ($variation->status !== $required) {
            throw new RuntimeException(
                "Variation must be in status '{$required}' to perform this action. Current: {$variation->status}."
            );
        }
    }

    private function logVariationActivity(Contract $contract, ContractVariation $variation, string $activityType, ?User $actor): void
    {
        $contract->activities()->create([
            'activity_type' => $activityType,
            'description'   => "Variation VO-{$variation->variation_no}: {$variation->title}.",
            'metadata'      => [
                'contract_id'     => $contract->id,
                'variation_id'    => $variation->id,
                'amount_delta'    => $variation->amount_delta,
                'time_delta_days' => $variation->time_delta_days,
            ],
            'actor_type' => $actor ? $actor->getMorphClass() : null,
            'actor_id'   => $actor ? (string) $actor->getKey() : null,
        ]);
    }
}
