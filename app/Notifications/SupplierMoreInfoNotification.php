<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\Supplier;
use Illuminate\Notifications\Messages\MailMessage;

class SupplierMoreInfoNotification extends BaseAppNotification
{
    public function __construct(
        public readonly Supplier $supplier,
    ) {}

    protected function getEventCode(): string
    {
        return 'supplier.more_info_requested';
    }

    /**
     * @return array<string, string|int|float|bool|null>
     */
    protected function getVariables(): array
    {
        $completeProfileUrl = $this->supplier->registration_token
            ? url("/supplier/complete/{$this->supplier->registration_token}")
            : url('/supplier/status');

        return [
            'supplier_name' => $this->supplier->legal_name_en,
            'more_info_notes' => $this->supplier->more_info_notes ?? '',
            'complete_profile_url' => $completeProfileUrl,
        ];
    }

    protected function getLink(): ?string
    {
        return null;
    }

    public function toMail(object $notifiable): MailMessage
    {
        $vars = $this->getVariables();
        $completeProfileUrl = $vars['complete_profile_url'] ?? url('/supplier/status');
        $mail = parent::toMail($notifiable);
        return $mail->action('Complete Your Profile', (string) $completeProfileUrl);
    }
}
