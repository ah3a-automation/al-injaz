<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Contract;
use App\Models\User;

class ContractPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('contract.manage');
    }

    public function view(User $user, Contract $contract): bool
    {
        return $user->can('contract.manage');
    }

    public function update(User $user, Contract $contract): bool
    {
        return $user->can('contract.manage');
    }

    public function sendForSignature(User $user, Contract $contract): bool
    {
        return $user->can('contract.manage');
    }

    public function activate(User $user, Contract $contract): bool
    {
        return $user->can('contract.manage');
    }

    public function complete(User $user, Contract $contract): bool
    {
        return $user->can('contract.manage');
    }

    public function terminate(User $user, Contract $contract): bool
    {
        return $user->can('contract.terminate');
    }
}
