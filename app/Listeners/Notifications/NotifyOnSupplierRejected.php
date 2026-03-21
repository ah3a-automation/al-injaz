<?php

declare(strict_types=1);

namespace App\Listeners\Notifications;

use App\Events\SupplierRejected;
use App\Mail\NotificationEventMail;
use App\Models\User;
use App\Notifications\SupplierRejectedNotification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Mail;

final class NotifyOnSupplierRejected implements ShouldQueue
{
    use InteractsWithQueue;

    public string $queue = 'notifications';

    public function handle(SupplierRejected $event): void
    {
        $cacheKey = 'notify:supplier.rejected:' . $event->supplier->id;

        if (! Cache::add($cacheKey, true, 60)) {
            return;
        }

        $supplier = $event->supplier->fresh();
        if ($supplier === null || $supplier->email === '') {
            return;
        }

        $notification = new SupplierRejectedNotification($supplier);
        $user = $supplier->supplier_user_id !== null
            ? User::find($supplier->supplier_user_id)
            : null;

        if ($user !== null) {
            $user->notify($notification);

            return;
        }

        $rendered = $notification->toArray(new User);
        $subject = is_string($rendered['title'] ?? null)
            ? $rendered['title']
            : $notification->getEventCode();
        $body = is_string($rendered['body'] ?? null) ? $rendered['body'] : '';

        Mail::to($supplier->email)->send(
            new NotificationEventMail(
                subjectLine: $subject,
                messageLine: $body,
                actionUrl: null,
            )
        );
    }
}
