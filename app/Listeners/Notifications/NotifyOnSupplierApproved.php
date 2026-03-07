<?php

declare(strict_types=1);

namespace App\Listeners\Notifications;

use App\Events\SupplierApproved;
use App\Models\User;
use App\Notifications\SupplierApprovedNotification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\Password;

class NotifyOnSupplierApproved implements ShouldQueue
{
    public string $queue = 'notifications';

    public function handle(SupplierApproved $event): void
    {
        $supplier = $event->supplier->fresh();
        if ($supplier === null || empty($supplier->email)) {
            return;
        }
        if (! $supplier->supplier_user_id) {
            return;
        }

        $user = User::find($supplier->supplier_user_id);
        if ($user === null) {
            return;
        }

        $token = Password::broker('users')->createToken($user);
        $url = url('/password/reset/' . $token . '?email=' . urlencode($user->email));
        $user->notify(new SupplierApprovedNotification($supplier, $url));
    }
}
