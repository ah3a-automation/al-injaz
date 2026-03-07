<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Rfq;
use App\Models\User;

class RfqPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('rfq.view');
    }

    public function view(User $user, Rfq $rfq): bool
    {
        return $user->can('rfq.view');
    }

    public function create(User $user): bool
    {
        return $user->can('rfq.create');
    }

    public function update(User $user, Rfq $rfq): bool
    {
        return $rfq->status === 'draft' && $user->can('rfq.create');
    }

    public function issue(User $user, Rfq $rfq): bool
    {
        return $rfq->status === 'draft' && $user->can('rfq.issue');
    }

    public function markResponsesReceived(User $user, Rfq $rfq): bool
    {
        return $rfq->status === 'issued' && $user->can('rfq.evaluate');
    }

    public function evaluate(User $user, Rfq $rfq): bool
    {
        return $rfq->status === 'supplier_submissions' && $user->can('rfq.evaluate');
    }

    public function award(User $user, Rfq $rfq): bool
    {
        return $rfq->status === 'evaluation' && $user->can('rfq.award');
    }

    public function close(User $user, Rfq $rfq): bool
    {
        return in_array($rfq->status, ['awarded', 'evaluation']) && $user->can('rfq.close');
    }

    public function delete(User $user, Rfq $rfq): bool
    {
        return $rfq->status === 'draft' && $user->can('rfq.create');
    }
}
