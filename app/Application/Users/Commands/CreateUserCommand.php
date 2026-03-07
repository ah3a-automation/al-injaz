<?php

declare(strict_types=1);

namespace App\Application\Users\Commands;

use App\Models\User;
use App\Notifications\UserCreatedNotification;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;

final class CreateUserCommand
{
    public function __construct(
        private readonly string $name,
        private readonly string $email,
        private readonly string $password,
        private readonly string $role,
        private readonly string $status = User::STATUS_ACTIVE,
        private readonly bool $mustChangePassword = true,
        private readonly ?string $phone = null,
        private readonly ?string $department = null,
        private readonly ?int $createdByUserId = null,
    ) {}

    public function handle(): User
    {
        return DB::transaction(function (): User {
            $user = User::create([
                'name' => $this->name,
                'email' => $this->email,
                'password' => Hash::make($this->password),
                'status' => $this->status,
                'must_change_password' => $this->mustChangePassword,
                'phone' => $this->phone,
                'department' => $this->department,
                'created_by_user_id' => $this->createdByUserId,
                'email_verified_at' => now(),
            ]);
            $user->assignRole($this->role);

            $token = Password::broker('users')->createToken($user);
            $url = url('/password/reset/' . $token . '?email=' . urlencode($user->email));
            $user->notify(new UserCreatedNotification($user, $url));

            return $user;
        });
    }
}
