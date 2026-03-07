<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;

abstract class BasePolicy
{
    abstract public function viewAny(User $user): bool;

    abstract public function view(User $user, Model $model): bool;

    abstract public function create(User $user): bool;

    abstract public function update(User $user, Model $model): bool;

    abstract public function delete(User $user, Model $model): bool;

    protected function isSuperAdmin(User $user): bool
    {
        return $user->hasRole('super_admin');
    }

    protected function isAdmin(User $user): bool
    {
        return $user->hasRole(['super_admin', 'admin']);
    }
}
