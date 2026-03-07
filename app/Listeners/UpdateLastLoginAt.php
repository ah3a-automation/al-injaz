<?php

declare(strict_types=1);

namespace App\Listeners;

use Illuminate\Auth\Events\Login;

final class UpdateLastLoginAt
{
    public function handle(Login $event): void
    {
        $event->user->update(['last_login_at' => now()]);
    }
}
