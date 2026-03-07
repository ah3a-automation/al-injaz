<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;

class ProjectPolicy extends BasePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('projects.viewAny');
    }

    public function view(User $user, Model $model): bool
    {
        return $user->can('projects.view');
    }

    public function create(User $user): bool
    {
        return $user->can('projects.create');
    }

    public function update(User $user, Model $model): bool
    {
        $project = $model instanceof Project ? $model : null;
        return $project && ($user->can('projects.update') || $project->owner_user_id === $user->id);
    }

    public function delete(User $user, Model $model): bool
    {
        $project = $model instanceof Project ? $model : null;
        return $project && ($user->can('projects.delete') || $project->owner_user_id === $user->id);
    }
}
