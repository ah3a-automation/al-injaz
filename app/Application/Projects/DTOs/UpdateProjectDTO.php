<?php

declare(strict_types=1);

namespace App\Application\Projects\DTOs;

use App\Http\Requests\Projects\UpdateProjectRequest;

final class UpdateProjectDTO
{
    public ?string $name = null;
    public ?string $description = null;
    public ?string $status = null;
    public ?string $startDate = null;
    public ?string $endDate = null;

    public static function fromRequest(UpdateProjectRequest $request): self
    {
        $dto = new self();
        $dto->name = $request->validated('name');
        $dto->description = $request->validated('description');
        $dto->status = $request->validated('status');
        $dto->startDate = $request->validated('start_date');
        $dto->endDate = $request->validated('end_date');
        return $dto;
    }
}
