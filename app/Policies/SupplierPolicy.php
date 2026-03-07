<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Supplier;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;

class SupplierPolicy extends BasePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('suppliers.view');
    }

    public function view(User $user, Model $model): bool
    {
        return $user->can('suppliers.view');
    }

    public function create(User $user): bool
    {
        return $user->can('suppliers.create');
    }

    public function update(User $user, Model $model): bool
    {
        return $user->can('suppliers.edit');
    }

    public function delete(User $user, Model $model): bool
    {
        return $user->can('suppliers.delete');
    }

    public function approve(User $user, Supplier $supplier): bool
    {
        return $user->can('suppliers.approve');
    }
}
