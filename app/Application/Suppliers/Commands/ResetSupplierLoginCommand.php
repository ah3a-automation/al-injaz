<?php

declare(strict_types=1);

namespace App\Application\Suppliers\Commands;

use App\Models\Supplier;
use App\Models\User;
use App\Notifications\UserCreatedNotification;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;

final class ResetSupplierLoginCommand
{
    public function __construct(
        private readonly Supplier $supplier,
    ) {}

    public function handle(): void
    {
        if (! $this->supplier->supplier_user_id) {
            throw new \InvalidArgumentException('Supplier has no login account.');
        }

        $user = User::findOrFail($this->supplier->supplier_user_id);
        $token = Password::broker('users')->createToken($user);
        $url = url('/password/reset/' . $token . '?email=' . urlencode($user->email));

        Notification::sendNow($user, new UserCreatedNotification($user, $url));
    }
}
