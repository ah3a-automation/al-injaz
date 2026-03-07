<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Project;
use App\Models\ProjectPackage;
use App\Models\User;

class ProjectPackagePolicy
{
    public function viewAny(User $user, Project $project): bool
    {
        return $user->can('projects.packages.view');
    }

    public function create(User $user, Project $project): bool
    {
        return $user->can('projects.packages.create');
    }

    public function update(User $user, ProjectPackage $package): bool
    {
        return $user->can('projects.packages.edit');
    }

    public function delete(User $user, ProjectPackage $package): bool
    {
        return $user->can('projects.packages.delete');
    }
}
