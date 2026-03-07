<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\MarginException;
use App\Models\User;

class MarginExceptionPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('margin.view_exceptions');
    }

    public function view(User $user, MarginException $exception): bool
    {
        return $user->can('margin.view_exceptions');
    }

    public function create(User $user): bool
    {
        return $user->can('margin.request_exception');
    }

    public function decide(User $user, MarginException $exception): bool
    {
        return $exception->status === 'pending'
            && $user->can('margin.approve_exception');
    }
}
