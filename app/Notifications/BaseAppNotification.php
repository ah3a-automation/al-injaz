<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Application\Notifications\ResolvedRecipient;
use App\Models\User;
use App\Models\UserNotificationPreference;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;

abstract class BaseAppNotification extends Notification implements ShouldQueue
{
    use Queueable;
    use SerializesModels;

    abstract public function getEventCode(): string;

    /**
     * @return array<string, string|int|float|bool|null>
     */
    abstract protected function getVariables(): array;

    abstract protected function getLink(): ?string;

    /**
     * Domain subject (supplier, task, project, …) for polymorphic system_notifications + resolver context.
     */
    abstract public function getNotifiable(): ?Model;

    /**
     * When set, delivery to the same user is suppressed unless the template has allow_self_notify.
     */
    protected function getActorUserId(): ?int
    {
        return null;
    }

    /**
     * Extra JSON metadata on system_notifications rows.
     *
     * @return array<string, mixed>
     */
    public function getNotificationMetadata(): array
    {
        return [];
    }

    protected function getTemplate(): ?object
    {
        return DB::table('notification_templates')
            ->where('event_code', $this->getEventCode())
            ->first();
    }

    protected function renderText(string $template, array $vars): string
    {
        foreach ($vars as $key => $value) {
            $template = str_replace('{{' . $key . '}}', (string) ($value ?? ''), $template);
        }

        return $template;
    }

    /**
     * system_notifications is the in-app canonical store (via {@see SystemNotificationChannel}).
     * Laravel's database notifications channel is not used.
     *
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        if (! $notifiable instanceof User) {
            return [];
        }

        $plan = app(NotificationResolver::class)->resolve(
            $this->getEventCode(),
            $notifiable,
            $this->getNotifiable(),
            $this->getActorUserId(),
        );

        $resolved = $plan->recipients->first(
            static fn (ResolvedRecipient $r): bool => $r->userId === $notifiable->id
        );

        if ($resolved === null || $resolved->channels === []) {
            return [];
        }

        /** @var list<string> $via */
        $via = [];
        foreach ($resolved->channels as $ch) {
            match ($ch) {
                UserNotificationPreference::CHANNEL_INAPP => $via[] = 'system',
                UserNotificationPreference::CHANNEL_EMAIL => $via[] = 'app-mail',
                UserNotificationPreference::CHANNEL_WHATSAPP => $via[] = 'whatsapp',
                UserNotificationPreference::CHANNEL_SMS => $via[] = 'sms',
                default => null,
            };
        }

        return $via;
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        $template = $this->getTemplate();
        $vars = $this->getVariables();

        return [
            'event_code' => $this->getEventCode(),
            'type' => $template?->type ?? 'info',
            'title' => $this->renderText($template?->name ?? '', $vars),
            'body' => $this->renderText($template?->body_text ?? '', $vars),
            'link' => $this->getLink(),
        ];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $template = $this->getTemplate();
        $vars = $this->getVariables();
        $subject = $this->renderText($template?->subject ?? 'Notification', $vars);
        $body = $this->renderText($template?->body_text ?? '', $vars);
        $link = $this->getLink();

        $mail = (new MailMessage)
            ->subject($subject)
            ->greeting('Hello,')
            ->line($body);

        if ($link !== null) {
            $mail->action('View Details', url($link));
        }

        return $mail->salutation('Al Injaz Team');
    }

    /**
     * Plain text for WhatsApp (markdown-style title).
     */
    public function toWhatsApp(object $notifiable): string
    {
        $template = $this->getTemplate();
        $vars = $this->getVariables();

        $title = $this->renderText($template?->name ?? '', $vars);
        $bodySource = '';
        if ($template !== null) {
            $bodySource = (string) (($template->whatsapp_body ?? null) ?: ($template->body_text ?? ''));
        }
        $body = $this->renderText($bodySource, $vars);
        $body = strip_tags($body);
        $body = html_entity_decode($body, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $body = trim(preg_replace("/[ \t]+/u", ' ', $body) ?? '');
        $body = trim(preg_replace("/\n{3,}/u", "\n\n", $body) ?? '');

        $link = $this->getLink();
        $lines = [];
        if ($title !== '') {
            $lines[] = '*' . $title . '*';
            $lines[] = '';
        }
        if ($body !== '') {
            $lines[] = $body;
        }
        if ($link !== null && $link !== '') {
            $lines[] = '';
            $lines[] = url($link);
        }

        return trim(implode("\n", $lines));
    }
}

