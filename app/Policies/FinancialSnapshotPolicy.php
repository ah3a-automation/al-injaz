<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\FinancialSnapshot;
use App\Models\User;

class FinancialSnapshotPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('finance.viewAny');
    }

    public function view(User $user, FinancialSnapshot $snapshot): bool
    {
        return $user->can('finance.view');
    }
}
