<?php

declare(strict_types=1);

namespace App\Listeners\Notifications;

use App\Events\SupplierRegistered;
use App\Models\User;
use App\Notifications\SupplierRegisteredNotification;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Notification;

/**
 * Sends in-app (and other configured) notifications to internal approvers.
 * Runs synchronously so registration is not dependent on a queue worker; the
 * notification itself uses {@see SupplierRegisteredNotification} which may still
 * queue mail/WhatsApp via Laravel's notification channels when configured.
 */
final class NotifyOnSupplierRegistered
{
    public function handle(SupplierRegistered $event): void
    {
        $cacheKey = 'notify:supplier.registered:'.$event->supplier->id;

        if (! Cache::add($cacheKey, true, 60)) {
            return;
        }

        $approvers = User::permission('suppliers.approve')->get();
        if ($approvers->isEmpty()) {
            return;
        }

        Notification::sendNow($approvers, new SupplierRegisteredNotification($event->supplier));
    }
}
