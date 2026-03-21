<?php

declare(strict_types=1);

namespace App\Providers;

use Illuminate\Foundation\Support\Providers\EventServiceProvider as ServiceProvider;

class EventServiceProvider extends ServiceProvider
{
    /**
     * @var array<class-string, array<int, class-string>>
     */
    protected $listen = [
        \App\Events\SupplierRegistered::class => [
            \App\Listeners\Notifications\NotifyOnSupplierRegistered::class,
        ],
        \App\Events\SupplierApproved::class => [
            \App\Listeners\Notifications\NotifyOnSupplierApproved::class,
        ],
        \App\Events\SupplierRejected::class => [
            \App\Listeners\Notifications\NotifyOnSupplierRejected::class,
        ],
        \App\Events\SupplierStatusChanged::class => [
            \App\Listeners\Notifications\NotifyOnSupplierStatusChanged::class,
        ],
        \Illuminate\Auth\Events\Login::class => [
            \App\Listeners\UpdateLastLoginAt::class,
        ],
    ];

    protected $discoverListenersWithin = [];

    public function shouldDiscoverEvents(): bool
    {
        return false;
    }

    public function boot(): void
    {
        //
    }
}
