<?php

declare(strict_types=1);

namespace App\Application\Suppliers\Queries;

use App\Models\Supplier;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

final class ListSuppliersQuery
{
    private const ALLOWED_SORT_FIELDS = [
        'legal_name_en',
        'supplier_code',
        'status',
        'supplier_type',
        'country',
        'created_at',
    ];

    public function __construct(
        private readonly ?string $q = null,
        private readonly ?string $status = null,
        private readonly ?string $supplierType = null,
        private readonly ?string $country = null,
        private readonly ?string $categoryId = null,
        private readonly string $sortField = 'created_at',
        private readonly string $sortDir = 'desc',
        private readonly int $perPage = 25,
        private readonly int $page = 1,
    ) {}

    public function handle(): LengthAwarePaginator
    {
        $sortField = in_array($this->sortField, self::ALLOWED_SORT_FIELDS, true)
            ? $this->sortField
            : 'created_at';
        $sortDir = $this->sortDir === 'asc' ? 'asc' : 'desc';

        return Supplier::query()
            ->with(['primaryContact', 'categories:id,code,name_en,name_ar'])
            ->when($this->q, fn ($query) => $query->where(fn ($inner) => $inner
                ->where('legal_name_en', 'ilike', '%' . $this->q . '%')
                ->orWhere('legal_name_ar', 'ilike', '%' . $this->q . '%')
                ->orWhere('trade_name', 'ilike', '%' . $this->q . '%')
                ->orWhere('supplier_code', 'ilike', '%' . $this->q . '%')
                ->orWhere('email', 'ilike', '%' . $this->q . '%')))
            ->when($this->status, fn ($q) => $q->where('status', $this->status))
            ->when($this->supplierType, fn ($q) => $q->where('supplier_type', $this->supplierType))
            ->when($this->country, fn ($q) => $q->where('country', $this->country))
            ->when($this->categoryId, fn ($q) => $q->whereHas('categories', fn ($c) => $c->where('supplier_categories.id', $this->categoryId)))
            ->orderBy($sortField, $sortDir)
            ->paginate($this->perPage, ['*'], 'page', $this->page);
    }
}
