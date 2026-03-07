<?php

declare(strict_types=1);

namespace App\Events;

use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class SupplierRejected
{
    use Dispatchable;
    use SerializesModels;

    public function __construct(
        public readonly Supplier $supplier,
        public readonly User $rejectedBy,
    ) {}
}
