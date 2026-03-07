<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\User;
use Illuminate\Notifications\Messages\MailMessage;

class UserCreatedNotification extends BaseAppNotification
{
    public function __construct(
        public readonly User $user,
        public readonly string $setPasswordUrl,
    ) {}

    protected function getEventCode(): string
    {
        return 'user.created';
    }

    /**
     * @return array<string, string|int|float|bool|null>
     */
    protected function getVariables(): array
    {
        return [
            'user_name' => $this->user->name,
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
