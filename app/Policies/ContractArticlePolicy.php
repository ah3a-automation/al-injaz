<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\ContractArticle;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;

class ContractArticlePolicy extends BasePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('contract.manage');
    }

    public function view(User $user, Model $model): bool
    {
        return $user->can('contract.manage');
    }

    public function create(User $user): bool
    {
        return $user->can('contract.manage');
    }

    public function update(User $user, Model $model): bool
    {
        if (! $user->can('contract.manage')) {
            return false;
        }

        if ($model instanceof ContractArticle && $model->isPendingApproval()) {
            return $this->isSuperAdmin($user);
        }

        return true;
    }

    public function delete(User $user, Model $model): bool
    {
        return $user->can('contract.manage');
    }

    public function submitForApproval(User $user, ContractArticle $article): bool
    {
        return $user->can('contract.library.submit') && $article->canBeSubmitted();
    }

    public function approveContracts(User $user, ContractArticle $article): bool
    {
        return $user->can('contract.library.approve_contracts')
            && ($article->approval_status ?? ContractArticle::APPROVAL_NONE) === ContractArticle::APPROVAL_SUBMITTED;
    }

    public function approveLegal(User $user, ContractArticle $article): bool
    {
        return $user->can('contract.library.approve_legal')
            && ($article->approval_status ?? ContractArticle::APPROVAL_NONE) === ContractArticle::APPROVAL_CONTRACTS_APPROVED;
    }

    public function reject(User $user, ContractArticle $article): bool
    {
        $status = $article->approval_status ?? ContractArticle::APPROVAL_NONE;

        if ($status === ContractArticle::APPROVAL_SUBMITTED) {
            return $user->can('contract.library.approve_contracts') || $user->can('contract.library.approve_legal');
        }

        if ($status === ContractArticle::APPROVAL_CONTRACTS_APPROVED) {
            return $user->can('contract.library.approve_legal');
        }

        return false;
    }

    /**
     * Restoring a historical content version (creates a new version row). Super admin only.
     */
    public function restoreVersion(User $user, ContractArticle $article): bool
    {
        return $this->isSuperAdmin($user);
    }
}

