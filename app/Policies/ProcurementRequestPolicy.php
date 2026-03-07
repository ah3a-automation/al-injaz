<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\ProcurementRequest;
use App\Models\User;

class ProcurementRequestPolicy
{
    public function create(User $user, \App\Models\ProcurementPackage $package): bool
    {
        return $user->can('update', $package->project);
    }

    public function view(User $user, ProcurementRequest $request): bool
    {
        return $user->can('update', $request->package->project);
    }
}
