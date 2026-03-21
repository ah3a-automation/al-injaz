<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\ContractTemplate;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;

class ContractTemplatePolicy extends BasePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('contract.manage');
    }

    public function view(User $user, Model|ContractTemplate $template): bool
    {
        return $user->can('contract.manage');
    }

    public function create(User $user): bool
    {
        return $user->can('contract.manage');
    }

    public function update(User $user, Model|ContractTemplate $template): bool
    {
        if (! $user->can('contract.manage')) {
            return false;
        }

        if ($template instanceof ContractTemplate && $template->isPendingApproval()) {
            return $this->isSuperAdmin($user);
        }

        return true;
    }

    public function delete(User $user, Model|ContractTemplate $template): bool
    {
        return $user->can('contract.manage');
    }

    public function submitForApproval(User $user, ContractTemplate $template): bool
    {
        return $user->can('contract.library.submit') && $template->canBeSubmitted();
    }

    public function approveContracts(User $user, ContractTemplate $template): bool
    {
        return $user->can('contract.library.approve_contracts')
            && ($template->approval_status ?? ContractTemplate::APPROVAL_NONE) === ContractTemplate::APPROVAL_SUBMITTED;
    }

    public function approveLegal(User $user, ContractTemplate $template): bool
    {
        return $user->can('contract.library.approve_legal')
            && ($template->approval_status ?? ContractTemplate::APPROVAL_NONE) === ContractTemplate::APPROVAL_CONTRACTS_APPROVED;
    }

    public function reject(User $user, ContractTemplate $template): bool
    {
        $status = $template->approval_status ?? ContractTemplate::APPROVAL_NONE;

        if ($status === ContractTemplate::APPROVAL_SUBMITTED) {
            return $user->can('contract.library.approve_contracts') || $user->can('contract.library.approve_legal');
        }

        if ($status === ContractTemplate::APPROVAL_CONTRACTS_APPROVED) {
            return $user->can('contract.library.approve_legal');
        }

        return false;
    }

    public function restoreTemplateVersion(User $user, ContractTemplate $template): bool
    {
        return $this->isSuperAdmin($user);
    }
}

