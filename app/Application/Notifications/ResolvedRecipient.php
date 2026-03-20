<?php

declare(strict_types=1);

namespace App\Application\Notifications;

final readonly class ResolvedRecipient
{
    /**
     * @param  list<string>  $channels
     */
    public function __construct(
        public int $userId,
        public array $channels,
    ) {}
}
