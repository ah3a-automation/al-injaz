<?php

declare(strict_types=1);

namespace App\Services\Procurement;

use App\Models\Contract;
use App\Models\ContractInvoice;
use App\Models\User;
use App\Services\Contracts\ContractInvoiceService as ContractInvoiceRollupService;
use App\Services\System\OutboxService;
use RuntimeException;

final class ContractInvoiceService
{
    public function __construct(
        private readonly OutboxService $outboxService,
        private readonly ContractInvoiceRollupService $contractInvoiceRollupService
    ) {}

    public function createInvoice(
        Contract $contract,
        User $actor,
        string $invoiceNo,
        string $invoiceDate,
        float $amount,
        float $retentionAmount,
        string $currency,
        ?string $notes = null
    ): ContractInvoice {
        if ($retentionAmount > $amount) {
            throw new RuntimeException('Retention amount cannot exceed invoice amount.');
        }

        $netAmount = $amount - $retentionAmount;

        $invoice = $contract->invoices()->create([
            'invoice_no'       => $invoiceNo,
            'invoice_date'     => $invoiceDate,
            'amount'           => $amount,
            'retention_amount' => $retentionAmount,
            'net_amount'       => $netAmount,
            'currency'         => $currency,
            'status'           => ContractInvoice::STATUS_DRAFT,
            'notes'            => $notes,
        ]);

        $this->logInvoiceActivity($contract, $invoice, 'contract_invoice_created', $actor);
        $this->contractInvoiceRollupService->refreshContractInvoiceSummary($contract->fresh());

        return $invoice;
    }

    public function submitInvoice(ContractInvoice $invoice, User $actor): void
    {
        $this->assertStatus($invoice, ContractInvoice::STATUS_DRAFT);
        $invoice->update([
            'status'       => ContractInvoice::STATUS_SUBMITTED,
            'submitted_by' => $actor->id,
        ]);
        $this->logInvoiceActivity($invoice->contract, $invoice, 'contract_invoice_submitted', $actor);
        $this->contractInvoiceRollupService->refreshContractInvoiceSummary($invoice->contract->fresh());
    }

    public function approveInvoice(ContractInvoice $invoice, User $approver): void
    {
        $updated = ContractInvoice::where('id', $invoice->id)
            ->where('status', ContractInvoice::STATUS_SUBMITTED)
            ->update([
                'status'      => ContractInvoice::STATUS_APPROVED,
                'approved_by' => $approver->id,
                'approved_at' => now(),
            ]);

        if (! $updated) {
            throw new RuntimeException('Invoice status changed by another process.');
        }

        $invoice->refresh();
        $this->logInvoiceActivity($invoice->contract, $invoice, 'contract_invoice_approved', $approver);
        $this->contractInvoiceRollupService->refreshContractInvoiceSummary($invoice->contract->fresh());
    }

    public function rejectInvoice(ContractInvoice $invoice, User $approver, string $reason): void
    {
        $this->assertStatus($invoice, ContractInvoice::STATUS_SUBMITTED);

        $metadata = array_merge((array) ($invoice->metadata ?? []), ['rejection_reason' => $reason]);

        $invoice->update([
            'status'   => ContractInvoice::STATUS_REJECTED,
            'metadata' => $metadata,
        ]);

        $this->logInvoiceActivity($invoice->contract, $invoice, 'contract_invoice_rejected', $approver, [
            'reason' => $reason,
        ]);
        $this->contractInvoiceRollupService->refreshContractInvoiceSummary($invoice->contract->fresh());
    }

    public function markPaid(ContractInvoice $invoice, User $actor): void
    {
        $this->assertStatus($invoice, ContractInvoice::STATUS_APPROVED);
        $invoice->update([
            'status'  => ContractInvoice::STATUS_PAID,
            'paid_at' => now(),
        ]);
        $this->logInvoiceActivity($invoice->contract, $invoice, 'contract_invoice_paid', $actor);
        $this->contractInvoiceRollupService->refreshContractInvoiceSummary($invoice->contract->fresh());

        $this->outboxService->record('contract.invoice_paid', 'contract_invoice', $invoice->id, [
            'contract_id'      => $invoice->contract_id,
            'invoice_id'       => $invoice->id,
            'invoice_no'       => $invoice->invoice_no,
            'amount'           => $invoice->amount,
            'net_amount'       => $invoice->net_amount,
        ]);
    }

    private function assertStatus(ContractInvoice $invoice, string $required): void
    {
        if ($invoice->status !== $required) {
            throw new RuntimeException(
                "Invoice must be in status '{$required}' to perform this action. Current: {$invoice->status}."
            );
        }
    }

    private function logInvoiceActivity(Contract $contract, ContractInvoice $invoice, string $activityType, ?User $actor, array $extra = []): void
    {
        $contract->activities()->create([
            'activity_type' => $activityType,
            'description'   => "Invoice {$invoice->invoice_no}.",
            'metadata'      => array_merge([
                'contract_id'     => $contract->id,
                'invoice_id'      => $invoice->id,
                'invoice_no'      => $invoice->invoice_no,
                'amount'          => $invoice->amount,
                'retention_amount'=> $invoice->retention_amount,
                'net_amount'      => $invoice->net_amount,
            ], $extra),
            'actor_type' => $actor ? $actor->getMorphClass() : null,
            'actor_id'   => $actor ? (string) $actor->getKey() : null,
        ]);
    }
}
