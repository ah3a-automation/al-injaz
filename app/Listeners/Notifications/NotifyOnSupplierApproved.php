<?php

declare(strict_types=1);

namespace App\Listeners\Notifications;

use App\Events\SupplierApproved;
use App\Models\User;
use App\Notifications\SupplierApprovedNotification;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;

/**
 * Sends the set-password email synchronously (after DB commit) so approval is not rolled back on mail failure.
 */
class NotifyOnSupplierApproved
{
    public function handle(SupplierApproved $event): void
    {
        $cacheKey = 'notify:supplier.approved:' . $event->supplier->id;

        if (! Cache::add($cacheKey, true, 60)) {
            return;
        }

        $supplier = $event->supplier->fresh();
        if ($supplier === null || $supplier->email === null || $supplier->email === '') {
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

        Notification::sendNow($user, new SupplierApprovedNotification($supplier, $url));
    }
}
