<?php

declare(strict_types=1);

namespace App\Services\Contracts;

use App\Models\Contract;
use App\Models\ContractInvoice;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use RuntimeException;

final class ContractInvoiceService
{
    /**
     * @return array{is_ready: bool, issues: array<int, string>}
     */
    public function checkInvoiceEligibility(Contract $contract): array
    {
        $issues = [];

        if ($contract->status !== Contract::STATUS_EXECUTED) {
            $issues[] = 'Contract must be executed to manage invoices.';
        }
        if ($contract->administration_status !== Contract::ADMIN_STATUS_INITIALIZED) {
            $issues[] = 'Administration baseline must be initialized before managing invoices.';
        }

        return [
            'is_ready' => $issues === [],
            'issues' => $issues,
        ];
    }

    /**
     * @param array{title: string, invoice_type: string, description?: string|null, amount: float|string, currency: string, period_from?: string|null, period_to?: string|null} $payload
     */
    public function createInvoice(Contract $contract, array $payload, User $actor): ContractInvoice
    {
        $eligibility = $this->checkInvoiceEligibility($contract);
        if (! $eligibility['is_ready']) {
            throw new RuntimeException(implode(' ', $eligibility['issues']));
        }

        $invoiceNo = $this->nextInvoiceNumber($contract);
        $amount = is_numeric($payload['amount']) ? (float) $payload['amount'] : 0.0;

        $invoice = new ContractInvoice();
        $invoice->contract_id = $contract->id;
        $invoice->invoice_no = $invoiceNo;
        $invoice->title = $payload['title'];
        $invoice->invoice_type = $payload['invoice_type'];
        $invoice->status = ContractInvoice::STATUS_DRAFT;
        $invoice->description = $payload['description'] ?? null;
        $invoice->amount = $amount;
        $invoice->currency = $payload['currency'];
        $invoice->period_from = isset($payload['period_from']) && $payload['period_from'] !== ''
            ? \Carbon\Carbon::parse($payload['period_from']) : null;
        $invoice->period_to = isset($payload['period_to']) && $payload['period_to'] !== ''
            ? \Carbon\Carbon::parse($payload['period_to']) : null;
        $invoice->created_by_user_id = $actor->id;
        $invoice->updated_by_user_id = $actor->id;
        $invoice->net_amount = $amount;
        $invoice->retention_amount = 0;
        $invoice->save();

        $this->refreshContractInvoiceSummary($contract);

        return $invoice;
    }

    /**
     * @param array{title?: string, invoice_type?: string, description?: string|null, amount?: float|string, currency?: string, period_from?: string|null, period_to?: string|null} $payload
     */
    public function updateInvoice(ContractInvoice $invoice, array $payload, User $actor): ContractInvoice
    {
        if ($invoice->status !== ContractInvoice::STATUS_DRAFT) {
            throw new RuntimeException('Only draft invoices can be updated.');
        }

        if (isset($payload['title'])) {
            $invoice->title = $payload['title'];
        }
        if (isset($payload['invoice_type'])) {
            $invoice->invoice_type = $payload['invoice_type'];
        }
        if (array_key_exists('description', $payload)) {
            $invoice->description = $payload['description'];
        }
        if (isset($payload['amount'])) {
            $amount = is_numeric($payload['amount']) ? (float) $payload['amount'] : (float) $invoice->amount;
            $invoice->amount = $amount;
            $invoice->net_amount = $amount;
        }
        if (isset($payload['currency'])) {
            $invoice->currency = $payload['currency'];
        }
        if (array_key_exists('period_from', $payload)) {
            $invoice->period_from = $payload['period_from'] !== null && $payload['period_from'] !== ''
                ? \Carbon\Carbon::parse($payload['period_from']) : null;
        }
        if (array_key_exists('period_to', $payload)) {
            $invoice->period_to = $payload['period_to'] !== null && $payload['period_to'] !== ''
                ? \Carbon\Carbon::parse($payload['period_to']) : null;
        }
        $invoice->updated_by_user_id = $actor->id;
        $invoice->save();

        $this->refreshContractInvoiceSummary($invoice->contract);

        return $invoice;
    }

    public function submitInvoice(ContractInvoice $invoice, User $actor): ContractInvoice
    {
        if ($invoice->status !== ContractInvoice::STATUS_DRAFT) {
            throw new RuntimeException('Invoice must be in draft to submit.');
        }

        $invoice->status = ContractInvoice::STATUS_SUBMITTED;
        $invoice->submitted_at = now();
        $invoice->submitted_by_user_id = $actor->id;
        $invoice->updated_by_user_id = $actor->id;
        $invoice->save();

        $this->refreshContractInvoiceSummary($invoice->contract);

        return $invoice;
    }

    public function approveInvoice(ContractInvoice $invoice, User $actor, ?string $notes = null): ContractInvoice
    {
        if ($invoice->status !== ContractInvoice::STATUS_SUBMITTED) {
            throw new RuntimeException('Invoice must be submitted to approve.');
        }

        $invoice->status = ContractInvoice::STATUS_APPROVED;
        $invoice->approved_at = now();
        $invoice->approved_by_user_id = $actor->id;
        $invoice->rejected_at = null;
        $invoice->rejected_by_user_id = null;
        $invoice->decision_notes = $notes;
        $invoice->updated_by_user_id = $actor->id;
        $invoice->save();

        $this->refreshContractInvoiceSummary($invoice->contract);

        return $invoice;
    }

    public function rejectInvoice(ContractInvoice $invoice, User $actor, ?string $notes = null): ContractInvoice
    {
        if ($invoice->status !== ContractInvoice::STATUS_SUBMITTED) {
            throw new RuntimeException('Invoice must be submitted to reject.');
        }

        $invoice->status = ContractInvoice::STATUS_REJECTED;
        $invoice->rejected_at = now();
        $invoice->rejected_by_user_id = $actor->id;
        $invoice->approved_at = null;
        $invoice->approved_by_user_id = null;
        $invoice->decision_notes = $notes;
        $invoice->updated_by_user_id = $actor->id;
        $invoice->save();

        $this->refreshContractInvoiceSummary($invoice->contract);

        return $invoice;
    }

    public function markPaid(ContractInvoice $invoice, User $actor, ?string $notes = null): ContractInvoice
    {
        if ($invoice->status !== ContractInvoice::STATUS_APPROVED) {
            throw new RuntimeException('Invoice must be approved to mark as paid.');
        }

        $invoice->status = ContractInvoice::STATUS_PAID;
        $invoice->paid_at = now();
        $invoice->paid_by_user_id = $actor->id;
        if ($notes !== null) {
            $invoice->decision_notes = $invoice->decision_notes
                ? $invoice->decision_notes . "\n" . $notes
                : $notes;
        }
        $invoice->updated_by_user_id = $actor->id;
        $invoice->save();

        $this->refreshContractInvoiceSummary($invoice->contract);

        return $invoice;
    }

    public function refreshContractInvoiceSummary(Contract $contract): Contract
    {
        $contract->refresh();
        $invoices = $contract->invoices()->get();

        $submitted = $invoices->where('status', ContractInvoice::STATUS_SUBMITTED);
        $approved = $invoices->whereIn('status', [ContractInvoice::STATUS_APPROVED, ContractInvoice::STATUS_PAID]);
        $paid = $invoices->where('status', ContractInvoice::STATUS_PAID);

        $contract->invoice_count_total = $invoices->count();
        $contract->invoice_count_approved = $approved->count();
        $contract->invoice_count_paid = $paid->count();
        $lineTotal = static fn (ContractInvoice $i): float => (float) ($i->net_amount ?? $i->amount ?? 0);
        $contract->invoice_total_submitted = $submitted->sum($lineTotal);
        $contract->invoice_total_approved = $approved->sum($lineTotal);
        $contract->invoice_total_paid = $paid->sum($lineTotal);
        $contract->save();

        return $contract;
    }

    public function nextInvoiceNumber(Contract $contract): string
    {
        $maxNo = $contract->invoices()
            ->whereRaw("invoice_no ~ '^INV-[0-9]+$'")
            ->selectRaw("COALESCE(MAX(CAST(SUBSTRING(invoice_no FROM 5) AS INTEGER)), 0) AS n")
            ->value('n');

        $next = (int) ($maxNo ?? 0) + 1;

        return 'INV-' . str_pad((string) $next, 3, '0', STR_PAD_LEFT);
    }
}
