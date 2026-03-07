<?php

declare(strict_types=1);

namespace App\Application\Tasks\Commands;

use App\Models\Task;

final class DeleteTaskCommand
{
    public function __construct(
        private readonly Task $task,
    ) {}

    public function handle(): void
    {
        $this->task->delete();
    }
}
