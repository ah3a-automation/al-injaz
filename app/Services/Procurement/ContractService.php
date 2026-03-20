<?php

declare(strict_types=1);

namespace App\Services\Procurement;

use App\Models\Contract;
use App\Models\Rfq;
use App\Models\RfqAward;
use App\Models\User;
use App\Services\System\OutboxService;
use RuntimeException;

final class ContractService
{
    public function __construct(
        private readonly OutboxService $outboxService
    ) {}

    public function createFromAward(Rfq $rfq, RfqAward $award, User $actor): Contract
    {
        if ($rfq->status !== Rfq::STATUS_AWARDED) {
            throw new RuntimeException('Contract can only be created when RFQ status is awarded.');
        }

        if ($rfq->contract()->exists()) {
            throw new RuntimeException('RFQ already has a contract. Duplicate contracts are not allowed.');
        }

        $contractNumber = $this->generateContractNumber($rfq);

        $contract = Contract::create([
            'rfq_id'                 => $rfq->id,
            'project_id'             => $rfq->project_id,
            'procurement_package_id' => $rfq->procurement_package_id,
            'supplier_id'            => $award->supplier_id,
            'contract_number'        => $contractNumber,
            'contract_value'         => $award->awarded_amount,
            'commercial_total'       => $award->awarded_amount,
            'currency'               => $award->currency ?? 'SAR',
            'status'                 => Contract::STATUS_DRAFT,
            'source_type'            => 'rfq_award',
            'created_by'             => $actor->id,
        ]);

        $rfq->changeStatus(Rfq::STATUS_CLOSED, $actor);

        $rfq->activities()->create([
            'activity_type' => 'contract_created',
            'description'   => 'Contract created from RFQ award.',
            'metadata'      => [
                'rfq_id'       => $rfq->id,
                'contract_id'  => $contract->id,
                'supplier_id'  => $award->supplier_id,
            ],
            'user_id'    => $actor->id,
            'actor_type' => $actor->getMorphClass(),
            'actor_id'   => (string) $actor->getKey(),
        ]);

        $this->outboxService->record('contract.created', 'contract', $contract->id, [
            'rfq_id'      => $rfq->id,
            'contract_id' => $contract->id,
            'supplier_id' => $award->supplier_id,
        ]);

        return $contract;
    }

    private function generateContractNumber(Rfq $rfq): string
    {
        $year = now()->format('Y');
        $compactId = str_replace('-', '', $rfq->id);
        $short = substr($compactId, 0, 8) . substr($compactId, -6);

        return "CT-{$year}-{$short}";
    }
}
