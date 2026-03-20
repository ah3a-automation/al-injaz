<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\Supplier;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Notifications\Messages\MailMessage;

final class SupplierMoreInfoNotification extends BaseAppNotification
{
    public function __construct(
        public readonly Supplier $supplier,
    ) {}

    public function getEventCode(): string
    {
        return 'supplier.more_info_requested';
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

    public function completeProfileUrl(): string
    {
        $vars = $this->getVariables();

        return isset($vars['complete_profile_url']) && is_string($vars['complete_profile_url'])
            ? $vars['complete_profile_url']
            : url('/supplier/status');
    }

    public function toMail(object $notifiable): MailMessage
    {
        $mail = parent::toMail($notifiable);

        return $mail->action('Complete Your Profile', $this->completeProfileUrl());
    }
}
