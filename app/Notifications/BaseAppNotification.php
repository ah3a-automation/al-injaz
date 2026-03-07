<?php

declare(strict_types=1);

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;

abstract class BaseAppNotification extends Notification implements ShouldQueue
{
    use Queueable;
    use SerializesModels;

    

    abstract protected function getEventCode(): string;

    /**
     * @return array<string, string|int|float|bool|null>
     */
    abstract protected function getVariables(): array;

    abstract protected function getLink(): ?string;

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
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        $template = $this->getTemplate();
        if (! $template) {
            return [];
        }
        $channels = [];
        if ($template->inapp_enabled) {
            $channels[] = 'database';
        }
        if ($template->email_enabled) {
            $channels[] = 'mail';
        }
        return $channels;
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
}
