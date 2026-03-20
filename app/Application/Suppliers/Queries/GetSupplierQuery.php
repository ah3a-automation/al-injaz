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
            'contacts.media',
            'documents.uploader.roles',
            'categories:id,name_en,name_ar,code,level,parent_id',
            'certifications',
            'primaryContact',
            'approver:id,name',
            'rejector:id,name',
            'supplierUser:id,name,email,status',
        ])->findOrFail($this->supplierId);
    }
}
