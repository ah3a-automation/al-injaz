<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\Supplier;
use Illuminate\Database\Eloquent\Model;

final class SupplierApprovedNotification extends BaseAppNotification
{
    public function __construct(
        public readonly Supplier $supplier,
        public readonly string $setPasswordUrl,
    ) {}

    public function getEventCode(): string
    {
        return 'supplier.approved';
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
            'set_password_url' => $this->setPasswordUrl,
        ];
    }

    protected function getLink(): ?string
    {
        return null;
    }

    protected function getMailActionUrl(): ?string
    {
        return $this->setPasswordUrl;
    }

    protected function getMailActionLabel(): ?string
    {
        return 'Set Your Password';
    }
}
