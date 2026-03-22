<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Contract;
use App\Models\ContractVariation;
use App\Models\User;

class ContractVariationPolicy
{
    public function create(User $user, Contract $contract): bool
    {
        return $user->can('contract.variation.create')
            && $user->can('view', $contract);
    }

    public function update(User $user, ContractVariation $variation): bool
    {
        return $user->can('contract.variation.create')
            && $user->can('view', $variation->contract);
    }

    public function submit(User $user, ContractVariation $variation): bool
    {
        return $user->can('contract.variation.create')
            && $user->can('view', $variation->contract);
    }

    public function approve(User $user, ContractVariation $variation): bool
    {
        return $user->can('contract.variation.approve')
            && $user->can('view', $variation->contract);
    }

    public function reject(User $user, ContractVariation $variation): bool
    {
        return $user->can('contract.variation.approve')
            && $user->can('view', $variation->contract);
    }
}
