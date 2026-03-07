<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\Supplier;
use Illuminate\Notifications\Messages\MailMessage;

class SupplierApprovedNotification extends BaseAppNotification
{
    public function __construct(
        public readonly Supplier $supplier,
        public readonly string $setPasswordUrl,
    ) {}

    protected function getEventCode(): string
    {
        return 'supplier.approved';
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

    public function toMail(object $notifiable): MailMessage
    {
        $mail = parent::toMail($notifiable);
        return $mail->action('Set Your Password', $this->setPasswordUrl);
    }
}
