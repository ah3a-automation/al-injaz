<?php

declare(strict_types=1);

namespace App\Events\Projects;

use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ProjectUpdated
{
    use Dispatchable;
    use SerializesModels;

    public function __construct(
        public readonly array $payload
    ) {}
}
