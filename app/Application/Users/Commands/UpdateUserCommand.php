<?php

declare(strict_types=1);

namespace App\Application\Users\Commands;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

final class UpdateUserCommand
{
    public function __construct(
        private readonly User $user,
        private readonly array $data,
        private readonly ?string $role = null,
    ) {}

    public function handle(): User
    {
        return DB::transaction(function (): User {
            $updateData = collect($this->data)->except(['password', 'role'])->toArray();
            if (! empty($this->data['password'])) {
                $updateData['password'] = Hash::make($this->data['password']);
            }
            $this->user->update($updateData);
            if ($this->role !== null) {
                $this->user->syncRoles([$this->role]);
            }
            return $this->user->fresh();
        });
    }
}
