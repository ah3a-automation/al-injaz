<?php

declare(strict_types=1);

namespace App\Support\Export;

use App\Models\Supplier;
use App\Support\Export\Contracts\Exportable;
use Illuminate\Database\Eloquent\Builder;

class SupplierExport implements Exportable
{
    public function getType(): string
    {
        return 'suppliers';
    }

    public function getTitle(): string
    {
        return 'Suppliers Export';
    }

    public function getHeadings(): array
    {
        return [
            'Code',
            'Legal Name (EN)',
            'Legal Name (AR)',
            'Type',
            'Country',
            'City',
            'Status',
            'Compliance',
            'Email',
            'Phone',
            'Categories',
            'Created At',
        ];
    }

    public function getQuery(array $filters): Builder
    {
        return Supplier::query()
            ->with(['categories:id,name'])
            ->when(! empty($filters['status']), fn ($q) => $q->where('status', $filters['status']))
            ->when(! empty($filters['supplier_type']), fn ($q) => $q->where('supplier_type', $filters['supplier_type']))
            ->when(! empty($filters['country']), fn ($q) => $q->where('country', $filters['country']))
            ->orderBy('created_at');
    }

    public function mapRow(mixed $model): array
    {
        \assert($model instanceof Supplier);

        return [
            $model->supplier_code,
            $model->legal_name_en,
            $model->legal_name_ar ?? '—',
            $model->supplier_type,
            $model->country,
            $model->city,
            $model->status,
            $model->compliance_status,
            $model->email ?? '—',
            $model->phone ?? '—',
            $model->categories->pluck('name')->implode(', ') ?: '—',
            $model->created_at?->format('Y-m-d'),
        ];
    }
}
