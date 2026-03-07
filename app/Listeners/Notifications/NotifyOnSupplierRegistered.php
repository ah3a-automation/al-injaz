<?php

declare(strict_types=1);

namespace App\Listeners\Notifications;

use App\Events\SupplierRegistered;
use App\Models\User;
use App\Notifications\SupplierRegisteredNotification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;

class NotifyOnSupplierRegistered implements ShouldQueue
{
    use InteractsWithQueue;

    public string $queue = 'notifications';

    public function handle(SupplierRegistered $event): void
    {
        $approvers = User::permission('suppliers.approve')->get();
        foreach ($approvers as $approver) {
            $approver->notify(new SupplierRegisteredNotification($event->supplier));
        }
    }
}
