<?php

declare(strict_types=1);

namespace App\Events;

use App\Models\Supplier;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class SupplierRegistered
{
    use Dispatchable;
    use SerializesModels;

    public function __construct(
        public readonly Supplier $supplier,
    ) {}
}
