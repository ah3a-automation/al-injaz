<?php

declare(strict_types=1);

namespace App\Domain\Projects;

class Project
{
    public string $id;
    public string $name;
    public ?string $description = null;
    public string $status = 'active';
    public int $ownerUserId;
    public ?string $startDate = null;
    public ?string $endDate = null;
    public string $createdAt;
    public string $updatedAt;
    public ?string $deletedAt = null;
}
