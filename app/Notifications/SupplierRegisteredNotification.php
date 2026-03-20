<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\Supplier;
use Illuminate\Database\Eloquent\Model;

final class SupplierRegisteredNotification extends BaseAppNotification
{
    public function __construct(
        public readonly Supplier $supplier,
    ) {}

    public function getEventCode(): string
    {
        return 'supplier.registered';
    }

    public function getNotifiable(): ?Model
    {
        return $this->supplier;
    }

    /**
     * @return array<string, mixed>
     */
    public function getNotificationMetadata(): array
    {
        return [
            'supplier_id' => $this->supplier->id,
        ];
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
