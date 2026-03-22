<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Contract;
use App\Models\ContractInvoice;
use App\Models\User;

class ContractInvoicePolicy
{
    public function create(User $user, Contract $contract): bool
    {
        return $user->can('contract.invoice.create')
            && $user->can('view', $contract);
    }

    public function update(User $user, ContractInvoice $invoice): bool
    {
        return $user->can('contract.invoice.create')
            && $user->can('view', $invoice->contract);
    }

    public function submit(User $user, ContractInvoice $invoice): bool
    {
        return $user->can('contract.invoice.create')
            && $user->can('view', $invoice->contract);
    }

    public function approve(User $user, ContractInvoice $invoice): bool
    {
        return $user->can('contract.invoice.approve')
            && $user->can('view', $invoice->contract);
    }

    public function reject(User $user, ContractInvoice $invoice): bool
    {
        return $user->can('contract.invoice.approve')
            && $user->can('view', $invoice->contract);
    }

    public function pay(User $user, ContractInvoice $invoice): bool
    {
        return $user->can('contract.invoice.pay')
            && $user->can('view', $invoice->contract);
    }
}
