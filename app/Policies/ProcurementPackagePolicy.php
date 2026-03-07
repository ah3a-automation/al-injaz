<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\ProcurementPackage;
use App\Models\Project;
use App\Models\User;

class ProcurementPackagePolicy
{
    public function viewAny(User $user, Project $project): bool
    {
        return $user->can('update', $project);
    }

    public function create(User $user, Project $project): bool
    {
        return $user->can('update', $project);
    }

    public function view(User $user, ProcurementPackage $package): bool
    {
        return $user->can('update', $package->project);
    }

    public function update(User $user, ProcurementPackage $package): bool
    {
        return $user->can('update', $package->project);
    }

    public function delete(User $user, ProcurementPackage $package): bool
    {
        return $user->can('update', $package->project);
    }
}
