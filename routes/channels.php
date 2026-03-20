<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('users.{userId}.notifications', static function ($user, string $userId): bool {
    return (int) $user->id === (int) $userId;
});

