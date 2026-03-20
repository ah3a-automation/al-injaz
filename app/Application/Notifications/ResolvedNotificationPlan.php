<?php

declare(strict_types=1);

namespace App\Application\Notifications;

use Illuminate\Support\Collection;

final readonly class ResolvedNotificationPlan
{
    /**
     * @param  Collection<int, ResolvedRecipient>  $recipients
     */
    public function __construct(
        public string $eventKey,
        public ?object $template,
        public Collection $recipients,
    ) {}
}
