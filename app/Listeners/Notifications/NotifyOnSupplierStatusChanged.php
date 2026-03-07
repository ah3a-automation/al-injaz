<?php

declare(strict_types=1);

namespace App\Listeners\Notifications;

use App\Events\SupplierStatusChanged;
use App\Notifications\SupplierMoreInfoNotification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\Notification;

class NotifyOnSupplierStatusChanged implements ShouldQueue
{
    public string $queue = 'notifications';

    public function handle(SupplierStatusChanged $event): void
    {
        if ($event->action !== 'request_info') {
            return;
        }

        $supplier = $event->supplier->fresh();
        if ($supplier === null || empty($supplier->email)) {
            return;
        }

        Notification::route('mail', $supplier->email)
            ->notify(new SupplierMoreInfoNotification($supplier));
    }
}
