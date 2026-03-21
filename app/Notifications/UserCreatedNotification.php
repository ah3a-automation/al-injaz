<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;

final class UserCreatedNotification extends BaseAppNotification
{
    public function __construct(
        public readonly User $user,
        public readonly string $setPasswordUrl,
    ) {}

    public function getEventCode(): string
    {
        return 'user.created';
    }

    public function getNotifiable(): ?Model
    {
        return $this->user;
    }

    /**
     * @return array<string, mixed>
     */
    public function getNotificationMetadata(): array
    {
        return [
            'user_id' => $this->user->id,
        ];
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

    protected function getMailActionUrl(): ?string
    {
        return $this->setPasswordUrl;
    }

    protected function getMailActionLabel(): ?string
    {
        return 'Set Your Password';
    }
}
