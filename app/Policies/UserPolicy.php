<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;

class UserPolicy extends BasePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('users.view');
    }

    public function view(User $user, Model $model): bool
    {
        return $user->can('users.view');
    }

    public function create(User $user): bool
    {
        return $user->can('users.create');
    }

    public function update(User $user, Model $model): bool
    {
        if (! $user->can('users.edit')) {
            return false;
        }
        $targetUser = $model instanceof User ? $model : null;
        if (! $targetUser) {
            return false;
        }
        if ($targetUser->hasRole('super_admin') && ! $user->hasRole('super_admin')) {
            return false;
        }
        return true;
    }

    public function delete(User $user, Model $model): bool
    {
        if (! $user->can('users.delete')) {
            return false;
        }
        $targetUser = $model instanceof User ? $model : null;
        if (! $targetUser) {
            return false;
        }
        if ($user->id === $targetUser->id) {
            return false;
        }
        if ($targetUser->hasRole('super_admin')) {
            return false;
        }
        return true;
    }
}
