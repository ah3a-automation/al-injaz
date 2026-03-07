<?php

declare(strict_types=1);

namespace App\Application\Suppliers\Commands;

use App\Models\Supplier;
use Illuminate\Support\Facades\DB;

final class UpdateSupplierCommand
{
    /**
     * @param array<string, mixed> $data
     * @param array<int, int>|null $categoryIds
     */
    public function __construct(
        private readonly Supplier $supplier,
        private readonly array $data,
        private readonly ?array $categoryIds = null,
    ) {}

    public function handle(): Supplier
    {
        DB::transaction(function () {
            $this->supplier->update($this->data);
            if ($this->categoryIds !== null) {
                $this->supplier->categories()->sync($this->categoryIds);
            }
        });
        return $this->supplier->fresh();
    }
}
