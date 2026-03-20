<?php

declare(strict_types=1);

namespace App\Services\Contracts;

use App\Models\Contract;
use App\Models\ContractSignatureEvent;
use App\Models\ContractSignatory;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use RuntimeException;

final class ContractSignatureTrackingService
{
    /**
     * @param array{signatory_type: string, name: string, email?: string|null, title?: string|null, sign_order: int, is_required?: bool, notes?: string|null} $payload
     */
    public function addSignatory(Contract $contract, array $payload, User $actor): ContractSignatory
    {
        return DB::transaction(function () use ($contract, $payload, $actor): ContractSignatory {
            $signatory = new ContractSignatory();
            $signatory->contract_id = $contract->id;
            $signatory->signatory_type = $payload['signatory_type'];
            $signatory->name = $payload['name'];
            $signatory->email = $payload['email'] ?? null;
            $signatory->title = $payload['title'] ?? null;
            $signatory->sign_order = (int) $payload['sign_order'];
            $signatory->is_required = $payload['is_required'] ?? true;
            $signatory->status = ContractSignatory::STATUS_PENDING;
            $signatory->created_by_user_id = $actor->id;
            $signatory->updated_by_user_id = $actor->id;
            $signatory->notes = $payload['notes'] ?? null;
            $signatory->save();

            $this->appendEvent(
                $contract,
                ContractSignatureEvent::EVENT_SIGNATORY_ADDED,
                $actor,
                $signatory,
                null,
                null,
                null
            );

            $this->recalculateContractSignatureStatus($contract);

            return $signatory;
        });
    }

    /**
     * @param array{name?: string, email?: string|null, title?: string|null, sign_order?: int, is_required?: bool, notes?: string|null} $payload
     */
    public function updateSignatory(Contract $contract, ContractSignatory $signatory, array $payload, User $actor): ContractSignatory
    {
        if ($signatory->contract_id !== $contract->id) {
            throw new RuntimeException('Signatory does not belong to this contract.');
        }

        return DB::transaction(function () use ($contract, $signatory, $payload, $actor): ContractSignatory {
            $signatory->name = $payload['name'] ?? $signatory->name;
            $signatory->email = $payload['email'] ?? $signatory->email;
            $signatory->title = $payload['title'] ?? $signatory->title;
            if (isset($payload['sign_order'])) {
                $signatory->sign_order = (int) $payload['sign_order'];
            }
            if (array_key_exists('is_required', $payload)) {
                $signatory->is_required = (bool) $payload['is_required'];
            }
            $signatory->notes = array_key_exists('notes', $payload) ? $payload['notes'] : $signatory->notes;
            $signatory->updated_by_user_id = $actor->id;
            $signatory->save();

            $this->appendEvent(
                $contract,
                ContractSignatureEvent::EVENT_SIGNATORY_UPDATED,
                $actor,
                $signatory,
                null,
                null,
                null
            );

            return $signatory;
        });
    }

    /**
     * @param 'signed'|'declined'|'skipped' $newStatus
     */
    public function markSignatoryStatus(
        Contract $contract,
        ContractSignatory $signatory,
        string $newStatus,
        User $actor,
        ?string $notes = null
    ): ContractSignatory {
        if ($signatory->contract_id !== $contract->id) {
            throw new RuntimeException('Signatory does not belong to this contract.');
        }

        if (! in_array($newStatus, [ContractSignatory::STATUS_SIGNED, ContractSignatory::STATUS_DECLINED, ContractSignatory::STATUS_SKIPPED], true)) {
            throw new RuntimeException('Invalid signatory status for this action.');
        }

        return DB::transaction(function () use ($contract, $signatory, $newStatus, $actor, $notes): ContractSignatory {
            $oldStatus = $signatory->status;
            $signatory->status = $newStatus;
            if ($newStatus === ContractSignatory::STATUS_SIGNED) {
                $signatory->signed_at = now();
            }
            if ($notes !== null) {
                $signatory->notes = ($signatory->notes ? $signatory->notes . "\n" : '') . $notes;
            }
            $signatory->updated_by_user_id = $actor->id;
            $signatory->save();

            $eventType = match ($newStatus) {
                ContractSignatory::STATUS_SIGNED => ContractSignatureEvent::EVENT_MARKED_SIGNED,
                ContractSignatory::STATUS_DECLINED => ContractSignatureEvent::EVENT_MARKED_DECLINED,
                ContractSignatory::STATUS_SKIPPED => ContractSignatureEvent::EVENT_MARKED_SKIPPED,
                default => throw new RuntimeException('Unreachable'),
            };
            $this->appendEvent($contract, $eventType, $actor, $signatory, $oldStatus, $newStatus, $notes);

            $this->recalculateContractSignatureStatus($contract);

            return $signatory;
        });
    }

    public function recalculateContractSignatureStatus(Contract $contract): void
    {
        $contract->refresh();
        $signatories = $contract->signatories()->get();
        if ($signatories->isEmpty()) {
            return;
        }

        $required = $signatories->where('is_required', true);
        $internalRequired = $required->where('signatory_type', ContractSignatory::TYPE_INTERNAL);
        $supplierRequired = $required->where('signatory_type', ContractSignatory::TYPE_SUPPLIER);

        $internalComplete = $internalRequired->isEmpty() || $internalRequired->every(
            fn (ContractSignatory $s): bool => $s->isSigned() || $s->isSkipped()
        );
        $allRequiredComplete = $required->every(
            fn (ContractSignatory $s): bool => $s->isSigned() || $s->isSkipped()
        );
        $anyRequiredDeclined = $required->contains(fn (ContractSignatory $s): bool => $s->isDeclined());
        $anySigned = $signatories->contains(fn (ContractSignatory $s): bool => $s->isSigned());
        $supplierPending = $supplierRequired->contains(fn (ContractSignatory $s): bool => $s->isPending());

        $newStatus = match (true) {
            $contract->status === Contract::STATUS_SIGNATURE_PACKAGE_ISSUED => Contract::STATUS_AWAITING_INTERNAL_SIGNATURE,
            $allRequiredComplete && ! $anyRequiredDeclined => Contract::STATUS_FULLY_SIGNED,
            $internalComplete && $supplierPending => Contract::STATUS_AWAITING_SUPPLIER_SIGNATURE,
            $anySigned => Contract::STATUS_PARTIALLY_SIGNED,
            default => $contract->status,
        };

        if ($newStatus !== $contract->status) {
            $contract->status = $newStatus;
            $contract->save();
        }
    }

    public function markExecuted(Contract $contract, User $actor, ?string $notes = null): Contract
    {
        if ($contract->status === Contract::STATUS_EXECUTED) {
            throw new RuntimeException('Contract is already executed.');
        }
        if ($contract->status !== Contract::STATUS_FULLY_SIGNED) {
            throw new RuntimeException('Contract must be fully signed before it can be marked as executed.');
        }

        return DB::transaction(function () use ($contract, $actor, $notes): Contract {
            $contract->status = Contract::STATUS_EXECUTED;
            $contract->executed_at = now();
            $contract->executed_by_user_id = $actor->id;
            $contract->save();

            $this->appendEvent(
                $contract,
                ContractSignatureEvent::EVENT_CONTRACT_EXECUTED,
                $actor,
                null,
                null,
                null,
                $notes
            );

            return $contract;
        });
    }

    private function appendEvent(
        Contract $contract,
        string $eventType,
        User $actor,
        ?ContractSignatory $signatory,
        ?string $oldStatus,
        ?string $newStatus,
        ?string $eventNotes
    ): void {
        $event = new ContractSignatureEvent();
        $event->contract_id = $contract->id;
        $event->contract_signatory_id = $signatory?->id;
        $event->event_type = $eventType;
        $event->event_notes = $eventNotes;
        $event->old_status = $oldStatus;
        $event->new_status = $newStatus;
        $event->changed_by_user_id = $actor->id;
        $event->save();
    }
}
