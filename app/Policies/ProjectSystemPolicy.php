<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Project;
use App\Models\ProjectSystem;
use App\Models\User;

class ProjectSystemPolicy
{
    public function viewAny(User $user, Project $project): bool
    {
        return $user->can('projects.systems.view');
    }

    public function create(User $user, Project $project): bool
    {
        return $user->can('projects.systems.create');
    }

    public function update(User $user, ProjectSystem $system): bool
    {
        return $user->can('projects.systems.edit');
    }

    public function delete(User $user, ProjectSystem $system): bool
    {
        return $user->can('projects.systems.delete');
    }
}
