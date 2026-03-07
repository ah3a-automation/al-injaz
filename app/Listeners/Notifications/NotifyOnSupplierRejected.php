<?php

declare(strict_types=1);

namespace App\Listeners\Notifications;

use App\Events\SupplierRejected;
use App\Notifications\SupplierRejectedNotification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\Notification;

class NotifyOnSupplierRejected implements ShouldQueue
{
    public string $queue = 'notifications';

    public function handle(SupplierRejected $event): void
    {
        $supplier = $event->supplier->fresh();
        if ($supplier === null || empty($supplier->email)) {
            return;
        }

        Notification::route('mail', $supplier->email)
            ->notify(new SupplierRejectedNotification($supplier));
    }
}
