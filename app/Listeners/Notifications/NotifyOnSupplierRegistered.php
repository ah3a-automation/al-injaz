<?php

declare(strict_types=1);

namespace App\Listeners\Notifications;

use App\Events\SupplierRegistered;
use App\Models\User;
use App\Notifications\SupplierRegisteredNotification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Cache;

class NotifyOnSupplierRegistered implements ShouldQueue
{
    use InteractsWithQueue;

    public string $queue = 'notifications';

    public function handle(SupplierRegistered $event): void
    {
        $cacheKey = 'notify:supplier.registered:' . $event->supplier->id;

        if (! Cache::add($cacheKey, true, 60)) {
            return;
        }

        $approvers = User::permission('suppliers.approve')->get();
        foreach ($approvers as $approver) {
            $approver->notify(new SupplierRegisteredNotification($event->supplier));
        }
    }
}
