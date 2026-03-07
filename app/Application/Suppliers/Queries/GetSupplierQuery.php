<?php

declare(strict_types=1);

namespace App\Application\Suppliers\Queries;

use App\Models\Supplier;

final class GetSupplierQuery
{
    public function __construct(
        private readonly string $supplierId,
    ) {}

    public function handle(): Supplier
    {
        return Supplier::with([
            'creator:id,name',
            'contacts',
            'documents',
            'categories:id,name,slug',
            'capabilities.category',
            'certifications',
            'zones',
            'primaryContact',
            'approver:id,name',
            'rejector:id,name',
            'supplierUser:id,name,email,status',
        ])->findOrFail($this->supplierId);
    }
}
