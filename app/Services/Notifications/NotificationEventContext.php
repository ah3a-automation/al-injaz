<?php

declare(strict_types=1);

namespace App\Services\Notifications;

/**
 * Runtime context passed into the notification engine.
 *
 * This is intentionally flexible: Phase 2 focuses on policy resolution + planning.
 * Dispatch actions currently rely on commonly provided fields such as title/message.
 *
 * Example keys (optional):
 * - actor_id
 * - supplier_id
 * - supplier_user_id
 * - record_creator_user_id
 * - title
 * - message
 * - link
 * - metadata (array)
 * - email (string)
 */
final class NotificationEventContext
{
    /**
     * @param array<string, mixed> $data
     */
    public function __construct(
        private readonly array $data,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return $this->data;
    }

    /**
     * @return mixed
     */
    public function get(string $key): mixed
    {
        return $this->data[$key] ?? null;
    }

    public function getTitle(): ?string
    {
        $v = $this->data['title'] ?? null;

        return is_string($v) && $v !== '' ? $v : null;
    }

    public function getMessage(): ?string
    {
        $v = $this->data['message'] ?? null;

        return is_string($v) && $v !== '' ? $v : null;
    }

    public function getLink(): ?string
    {
        $v = $this->data['link'] ?? null;

        return is_string($v) && $v !== '' ? $v : null;
    }

    /**
     * @return array<string, mixed>
     */
    public function getMetadata(): array
    {
        $v = $this->data['metadata'] ?? [];

        return is_array($v) ? $v : [];
    }
}

