<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Contract;
use App\Models\ContractInvoice;
use App\Services\ActivityLogger;
use App\Services\Contracts\ContractInvoiceService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

final class ContractInvoiceController extends Controller
{
    public function __construct(
        private readonly ContractInvoiceService $invoiceService,
        private readonly ActivityLogger $activityLogger,
    ) {
    }

    public function store(Request $request, Contract $contract): RedirectResponse
    {
        $this->authorize('update', $contract);

        if (! $contract->canManageInvoices()) {
            return back()->with('error', __('contracts.invoices.not_eligible'));
        }

        // Phase 13: title is required on create/update; DB column nullable only for legacy rows (backfilled from invoice_no)
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'invoice_type' => ['required', 'string', 'in:advance,interim,final,administrative'],
            'description' => ['nullable', 'string'],
            'amount' => ['required', 'numeric', 'min:0'],
            'currency' => ['required', 'string', 'max:10'],
            'period_from' => ['nullable', 'date'],
            'period_to' => ['nullable', 'date', 'after_or_equal:period_from'],
        ]);

        /** @var \App\Models\User $user */
        $user = $request->user();

        try {
            $invoice = $this->invoiceService->createInvoice($contract, $validated, $user);
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        $this->activityLogger->log(
            'contracts.contract.invoice_created',
            $contract,
            [],
            [
                'invoice_id' => (string) $invoice->id,
                'invoice_no' => $invoice->invoice_no,
                'invoice_type' => $invoice->invoice_type,
                'amount' => (string) $invoice->amount,
                'currency' => $invoice->currency,
            ],
            $user
        );

        return back()->with('success', __('contracts.invoices.created'));
    }

    public function update(Request $request, Contract $contract, ContractInvoice $invoice): RedirectResponse
    {
        $this->authorize('update', $contract);

        if ($invoice->contract_id !== $contract->id || ! $invoice->isDraft()) {
            return back()->with('error', __('contracts.invoices.cannot_edit'));
        }

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'invoice_type' => ['required', 'string', 'in:advance,interim,final,administrative'],
            'description' => ['nullable', 'string'],
            'amount' => ['required', 'numeric', 'min:0'],
            'currency' => ['required', 'string', 'max:10'],
            'period_from' => ['nullable', 'date'],
            'period_to' => ['nullable', 'date', 'after_or_equal:period_from'],
        ]);

        /** @var \App\Models\User $user */
        $user = $request->user();

        try {
            $invoice = $this->invoiceService->updateInvoice($invoice, $validated, $user);
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        $this->activityLogger->log(
            'contracts.contract.invoice_updated',
            $contract,
            [],
            [
                'invoice_id' => (string) $invoice->id,
                'invoice_no' => $invoice->invoice_no,
            ],
            $user
        );

        return back()->with('success', __('contracts.invoices.updated'));
    }

    public function submit(Request $request, Contract $contract, ContractInvoice $invoice): RedirectResponse
    {
        $this->authorize('update', $contract);

        if ($invoice->contract_id !== $contract->id) {
            return back()->with('error', __('contracts.invoices.not_found'));
        }

        /** @var \App\Models\User $user */
        $user = $request->user();

        try {
            $invoice = $this->invoiceService->submitInvoice($invoice, $user);
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        $this->activityLogger->log(
            'contracts.contract.invoice_submitted',
            $contract,
            ['status' => ContractInvoice::STATUS_DRAFT],
            [
                'invoice_id' => (string) $invoice->id,
                'invoice_no' => $invoice->invoice_no,
                'status' => $invoice->status,
            ],
            $user
        );

        return back()->with('success', __('contracts.invoices.submitted'));
    }

    public function approve(Request $request, Contract $contract, ContractInvoice $invoice): RedirectResponse
    {
        $this->authorize('update', $contract);

        if ($invoice->contract_id !== $contract->id) {
            return back()->with('error', __('contracts.invoices.not_found'));
        }

        $validated = $request->validate([
            'decision_notes' => ['nullable', 'string'],
        ]);

        /** @var \App\Models\User $user */
        $user = $request->user();

        try {
            $invoice = $this->invoiceService->approveInvoice(
                $invoice,
                $user,
                $validated['decision_notes'] ?? null
            );
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        $this->activityLogger->log(
            'contracts.contract.invoice_approved',
            $contract,
            ['status' => ContractInvoice::STATUS_SUBMITTED],
            [
                'invoice_id' => (string) $invoice->id,
                'invoice_no' => $invoice->invoice_no,
                'status' => $invoice->status,
                'amount' => (string) $invoice->amount,
                'currency' => $invoice->currency,
            ],
            $user
        );

        return back()->with('success', __('contracts.invoices.approved'));
    }

    public function reject(Request $request, Contract $contract, ContractInvoice $invoice): RedirectResponse
    {
        $this->authorize('update', $contract);

        if ($invoice->contract_id !== $contract->id) {
            return back()->with('error', __('contracts.invoices.not_found'));
        }

        $validated = $request->validate([
            'decision_notes' => ['nullable', 'string'],
        ]);

        /** @var \App\Models\User $user */
        $user = $request->user();

        try {
            $invoice = $this->invoiceService->rejectInvoice(
                $invoice,
                $user,
                $validated['decision_notes'] ?? null
            );
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        $this->activityLogger->log(
            'contracts.contract.invoice_rejected',
            $contract,
            ['status' => ContractInvoice::STATUS_SUBMITTED],
            [
                'invoice_id' => (string) $invoice->id,
                'invoice_no' => $invoice->invoice_no,
                'status' => $invoice->status,
            ],
            $user
        );

        return back()->with('success', __('contracts.invoices.rejected'));
    }

    public function markPaid(Request $request, Contract $contract, ContractInvoice $invoice): RedirectResponse
    {
        $this->authorize('update', $contract);

        if ($invoice->contract_id !== $contract->id) {
            return back()->with('error', __('contracts.invoices.not_found'));
        }

        $validated = $request->validate([
            'decision_notes' => ['nullable', 'string'],
        ]);

        /** @var \App\Models\User $user */
        $user = $request->user();

        try {
            $invoice = $this->invoiceService->markPaid(
                $invoice,
                $user,
                $validated['decision_notes'] ?? null
            );
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        $this->activityLogger->log(
            'contracts.contract.invoice_paid',
            $contract,
            ['status' => ContractInvoice::STATUS_APPROVED],
            [
                'invoice_id' => (string) $invoice->id,
                'invoice_no' => $invoice->invoice_no,
                'status' => $invoice->status,
                'amount' => (string) $invoice->amount,
                'currency' => $invoice->currency,
            ],
            $user
        );

        return back()->with('success', __('contracts.invoices.paid'));
    }
}
