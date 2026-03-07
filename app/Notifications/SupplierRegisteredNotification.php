<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\Supplier;

class SupplierRegisteredNotification extends BaseAppNotification
{
    public function __construct(
        public readonly Supplier $supplier,
    ) {}

    protected function getEventCode(): string
    {
        return 'supplier.registered';
    }

    /**
     * @return array<string, string|int|float|bool|null>
     */
    protected function getVariables(): array
    {
        return [
            'supplier_name' => $this->supplier->legal_name_en,
            'supplier_code' => $this->supplier->supplier_code,
        ];
    }

    protected function getLink(): ?string
    {
        return "/suppliers/{$this->supplier->id}";
    }
}
