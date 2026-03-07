<?php

declare(strict_types=1);

namespace App\Application\Users\Commands;

use App\Models\User;

final class DeleteUserCommand
{
    public function __construct(
        private readonly User $user,
        private readonly int $currentUserId,
    ) {}

    public function handle(): void
    {
        if ($this->user->id === $this->currentUserId) {
            throw new \InvalidArgumentException('Cannot delete your own account.');
        }
        if ($this->user->hasRole('super_admin')) {
            throw new \InvalidArgumentException('Cannot delete super admin account.');
        }
        $this->user->delete();
    }
}
