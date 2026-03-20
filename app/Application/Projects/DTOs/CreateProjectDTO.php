<?php

declare(strict_types=1);

namespace App\Application\Projects\DTOs;

use App\Http\Requests\Projects\StoreProjectRequest;

final class CreateProjectDTO
{
    public string $name;
    public ?string $description = null;
    public string $status = 'active';
    public ?string $startDate = null;
    public ?string $endDate = null;
    public ?string $code = null;
    public ?string $nameEn = null;
    public ?string $nameAr = null;
    public ?string $client = null;
    public ?string $currency = null;
    public ?float $contractValue = null;
    public ?float $plannedMarginPct = null;
    public ?float $minMarginPct = null;

    public static function fromRequest(StoreProjectRequest $request): self
    {
        $dto = new self();
        $dto->name = $request->validated('name');
        $dto->description = $request->validated('description');
        $dto->status = $request->validated('status') ?? 'active';
        $dto->startDate = $request->validated('start_date');
        $dto->endDate = $request->validated('end_date');
        $dto->code = $request->validated('code');
        $dto->nameEn = $request->validated('name_en');
        $dto->nameAr = $request->validated('name_ar');
        $dto->client = $request->validated('client');
        $dto->currency = $request->validated('currency');
        $cv = $request->validated('contract_value');
        $dto->contractValue = $cv !== null ? (float) $cv : null;
        $pm = $request->validated('planned_margin_pct');
        $dto->plannedMarginPct = $pm !== null ? (float) $pm : null;
        $mm = $request->validated('min_margin_pct');
        $dto->minMarginPct = $mm !== null ? (float) $mm : null;
        return $dto;
    }
}
