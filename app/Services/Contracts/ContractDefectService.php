<?php

declare(strict_types=1);

namespace App\Services\Contracts;

use App\Models\Contract;
use App\Models\ContractDefectEvent;
use App\Models\ContractDefectItem;
use App\Models\User;
use RuntimeException;

final class ContractDefectService
{
    /**
     * @return array{is_ready: bool, issues: array<int, string>}
     */
    public function checkDefectEligibility(Contract $contract): array
    {
        $issues = [];

        if ($contract->status !== Contract::STATUS_EXECUTED) {
            $issues[] = 'Contract must be executed to manage defects.';
        }
        if ($contract->administration_status !== Contract::ADMIN_STATUS_INITIALIZED) {
            $issues[] = 'Administration baseline must be initialized.';
        }
        if (! in_array($contract->closeout_status, [Contract::CLOSEOUT_STATUS_READY_FOR_CLOSEOUT, Contract::CLOSEOUT_STATUS_CLOSED_OUT], true)) {
            $issues[] = 'Closeout must be initialized (ready or closed) before managing defects.';
        }

        return [
            'is_ready' => $issues === [],
            'issues' => $issues,
        ];
    }

    /**
     * @param array{defects_liability_start_at?: string|null, defects_liability_end_at?: string|null} $payload
     */
    public function initializeWarrantyWindow(Contract $contract, array $payload, User $actor): Contract
    {
        $eligibility = $this->checkDefectEligibility($contract);
        if (! $eligibility['is_ready']) {
            throw new RuntimeException(implode(' ', $eligibility['issues']));
        }

        $contract->defects_liability_start_at = isset($payload['defects_liability_start_at']) && $payload['defects_liability_start_at'] !== ''
            ? \Carbon\Carbon::parse($payload['defects_liability_start_at']) : null;
        $contract->defects_liability_end_at = isset($payload['defects_liability_end_at']) && $payload['defects_liability_end_at'] !== ''
            ? \Carbon\Carbon::parse($payload['defects_liability_end_at']) : null;
        $contract->warranty_status = 'open';
        $contract->save();

        return $contract;
    }

    /**
     * @param array{title: string, description?: string|null, notes?: string|null} $payload
     */
    public function createDefectItem(Contract $contract, array $payload, User $actor): ContractDefectItem
    {
        $eligibility = $this->checkDefectEligibility($contract);
        if (! $eligibility['is_ready']) {
            throw new RuntimeException(implode(' ', $eligibility['issues']));
        }

        $referenceNo = $this->nextDefectReference($contract);
        $item = new ContractDefectItem();
        $item->contract_id = $contract->id;
        $item->reference_no = $referenceNo;
        $item->title = $payload['title'];
        $item->description = $payload['description'] ?? null;
        $item->notes = $payload['notes'] ?? null;
        $item->status = ContractDefectItem::STATUS_OPEN;
        $item->reported_at = now();
        $item->created_by_user_id = $actor->id;
        $item->updated_by_user_id = $actor->id;
        $item->save();

        $this->appendDefectEvent($item, null, ContractDefectItem::STATUS_OPEN, $actor, null);

        return $item;
    }

    public function updateDefectStatus(ContractDefectItem $item, string $newStatus, User $actor, ?string $notes = null): ContractDefectItem
    {
        $oldStatus = $item->status;
        $allowed = match ($oldStatus) {
            ContractDefectItem::STATUS_OPEN => [ContractDefectItem::STATUS_IN_PROGRESS, ContractDefectItem::STATUS_RESOLVED],
            ContractDefectItem::STATUS_IN_PROGRESS => [ContractDefectItem::STATUS_RESOLVED],
            ContractDefectItem::STATUS_RESOLVED => [ContractDefectItem::STATUS_CLOSED],
            default => [],
        };
        if (! in_array($newStatus, $allowed, true)) {
            throw new RuntimeException("Transition from {$oldStatus} to {$newStatus} is not allowed.");
        }

        $item->status = $newStatus;
        $item->updated_by_user_id = $actor->id;
        if ($newStatus === ContractDefectItem::STATUS_RESOLVED && $item->resolved_at === null) {
            $item->resolved_at = now();
        }
        if ($newStatus === ContractDefectItem::STATUS_CLOSED && $item->closed_at === null) {
            $item->closed_at = now();
        }
        $item->save();

        $this->appendDefectEvent($item, $oldStatus, $newStatus, $actor, $notes);

        return $item;
    }

    public function nextDefectReference(Contract $contract): string
    {
        $maxNo = $contract->defectItems()
            ->whereRaw("reference_no ~ '^DEF-[0-9]+$'")
            ->selectRaw("COALESCE(MAX(CAST(SUBSTRING(reference_no FROM 5) AS INTEGER)), 0) AS n")
            ->value('n');

        $next = (int) ($maxNo ?? 0) + 1;

        return 'DEF-' . str_pad((string) $next, 3, '0', STR_PAD_LEFT);
    }

    private function appendDefectEvent(ContractDefectItem $item, ?string $oldStatus, ?string $newStatus, User $actor, ?string $eventNotes): void
    {
        $event = new ContractDefectEvent();
        $event->contract_defect_item_id = $item->id;
        $event->old_status = $oldStatus;
        $event->new_status = $newStatus;
        $event->event_notes = $eventNotes;
        $event->changed_by_user_id = $actor->id;
        $event->save();
    }
}
