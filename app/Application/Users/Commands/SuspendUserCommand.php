<?php

declare(strict_types=1);

namespace App\Application\Users\Commands;

use App\Models\User;

final class SuspendUserCommand
{
    public function __construct(
        private readonly User $user,
        private readonly string $newStatus,
    ) {}

    public function handle(): User
    {
        if (! in_array($this->newStatus, ['active', 'inactive', 'suspended'], true)) {
            throw new \InvalidArgumentException("Invalid status: {$this->newStatus}");
        }
        $this->user->update(['status' => $this->newStatus]);
        return $this->user->fresh();
    }
}
