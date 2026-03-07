<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Task;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;

class TaskPolicy extends BasePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('tasks.view');
    }

    public function view(User $user, Model $model): bool
    {
        return $user->can('tasks.view');
    }

    public function create(User $user): bool
    {
        return $user->can('tasks.create');
    }

    public function update(User $user, Model $model): bool
    {
        return $user->can('tasks.edit');
    }

    public function delete(User $user, Model $model): bool
    {
        return $user->can('tasks.delete');
    }
}
