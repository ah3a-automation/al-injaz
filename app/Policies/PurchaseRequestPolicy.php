<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\PurchaseRequest;
use App\Models\User;

class PurchaseRequestPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('pr.view');
    }

    public function view(User $user, PurchaseRequest $pr): bool
    {
        return $user->can('pr.view');
    }

    public function create(User $user): bool
    {
        return $user->can('pr.create');
    }

    public function update(User $user, PurchaseRequest $pr): bool
    {
        if ($pr->status !== 'draft') {
            return false;
        }
        return $user->can('pr.create');
    }

    public function submit(User $user, PurchaseRequest $pr): bool
    {
        return $pr->status === 'draft' && $user->can('pr.submit');
    }

    public function approve(User $user, PurchaseRequest $pr): bool
    {
        return $pr->status === 'submitted' && $user->can('pr.approve');
    }

    public function reject(User $user, PurchaseRequest $pr): bool
    {
        return $pr->status === 'submitted' && $user->can('pr.reject');
    }

    public function convertToRfq(User $user, PurchaseRequest $pr): bool
    {
        return $pr->status === 'approved' && $user->can('pr.convert_to_rfq');
    }

    public function delete(User $user, PurchaseRequest $pr): bool
    {
        return $pr->status === 'draft' && $user->can('pr.create');
    }
}
