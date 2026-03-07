<?php

declare(strict_types=1);

namespace App\Application\Users\Queries;

use App\Models\User;

final class GetUserQuery
{
    public function __construct(
        private readonly int $userId,
    ) {}

    public function handle(): User
    {
        return User::with(['roles.permissions', 'creator:id,name', 'createdUsers:id,name,email'])
            ->findOrFail($this->userId);
    }
}
