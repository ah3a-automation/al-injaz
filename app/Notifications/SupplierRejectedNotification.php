<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\Supplier;

class SupplierRejectedNotification extends BaseAppNotification
{
    public function __construct(
        public readonly Supplier $supplier,
    ) {}

    protected function getEventCode(): string
    {
        return 'supplier.rejected';
    }

    /**
     * @return array<string, string|int|float|bool|null>
     */
    protected function getVariables(): array
    {
        return [
            'supplier_name' => $this->supplier->legal_name_en,
            'rejection_reason' => $this->supplier->rejection_reason ?? 'Please contact us.',
        ];
    }

    protected function getLink(): ?string
    {
        return null;
    }
}
