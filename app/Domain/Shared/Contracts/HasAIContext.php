<?php

declare(strict_types=1);

namespace App\Domain\Shared\Contracts;

interface HasAIContext
{
    /**
     * Returns structured context for AI consumption.
     * Must pass policy check before calling.
     * Never expose cost breakdowns, margins, or internal formulas.
     *
     * @return array<string, scalar|array<string, mixed>|bool|null>
     */
    public function toAIContext(): array;
}
