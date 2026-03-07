<?php

declare(strict_types=1);

namespace App\Application\Suppliers\Commands;

use App\Models\Supplier;

final class DeleteSupplierCommand
{
    public function __construct(
        private readonly Supplier $supplier,
    ) {}

    public function handle(): void
    {
        $this->supplier->delete();
    }
}
