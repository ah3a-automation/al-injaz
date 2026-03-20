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
        return $user->can('contract.manage');
    }

    public function delete(User $user, Model|ContractTemplate $template): bool
    {
        return $user->can('contract.manage');
    }
}

