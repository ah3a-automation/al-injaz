<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Application\Notifications\ResolvedRecipient;
use App\Mail\SystemNotificationMail;
use App\Models\User;
use App\Models\UserNotificationPreference;
use App\Support\BrandingHelper;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Mail\Mailable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Notifications\Notification;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

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

    /**
     * Optional CTA label for HTML email; override with {@see getMailActionUrl()}.
     */
    protected function getMailActionLabel(): ?string
    {
        $url = $this->getMailActionUrl();

        return $url !== null && $url !== '' ? 'View Details' : null;
    }

    /**
     * Optional CTA URL for HTML email (relative path or absolute URL).
     */
    protected function getMailActionUrl(): ?string
    {
        $link = $this->getLink();
        if ($link === null || $link === '') {
            return null;
        }

        return $link;
    }

    /**
     * Always load from DB at call time (never cache on the notification instance).
     * Queued jobs must see the latest template after admin edits.
     */
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
     * Convert plain body_text to simple HTML paragraphs (no markdown).
     */
    protected function bodyTextToHtml(string $plain): string
    {
        $bodyRaw = $this->stripMarkdownForPlainEmail($plain);
        if (trim($bodyRaw) === '') {
            return '';
        }

        $paragraphs = preg_split('/\r\n\s*\r\n|\n\s*\n/', $bodyRaw, -1, PREG_SPLIT_NO_EMPTY) ?: [$bodyRaw];
        $out = [];
        foreach ($paragraphs as $paragraph) {
            $p = trim($paragraph);
            if ($p !== '') {
                $out[] = '<p style="margin:0 0 12px 0;">' . e($p) . '</p>';
            }
        }

        return implode('', $out);
    }

    private function stripMarkdownForPlainEmail(string $body): string
    {
        $lines = preg_split("/\r\n|\n|\r/", $body) ?: [];
        $strippedLines = [];
        foreach ($lines as $line) {
            $strippedLines[] = preg_replace('/^\s*#+\s*/u', '', $line) ?? '';
        }
        $out = implode("\n", $strippedLines);
        $out = preg_replace('/\*\*(.+?)\*\*/us', '$1', $out) ?? $out;
        $out = str_replace('**', '', $out);

        return trim($out);
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

    public function toMail(object $notifiable): Mailable
    {
        $template = $this->getTemplate();
        $vars = $this->getVariables();
        $subject = $this->renderText($template?->subject ?? 'Notification', $vars);

        $bodyHtmlRaw = $template?->body_html ?? null;
        if ($bodyHtmlRaw !== null && trim((string) $bodyHtmlRaw) !== '') {
            $bodyHtml = $this->renderText((string) $bodyHtmlRaw, $vars);
        } else {
            $bodyHtml = $this->bodyTextToHtml($this->renderText($template?->body_text ?? '', $vars));
        }

        $branding = BrandingHelper::get();
        $companyName = $branding['display_name'];
        $logoUrl = $branding['logo'] !== null ? asset($branding['logo']) : null;
        $primaryColor = $branding['brand_primary_color'] ?? '#373d42';

        $actionUrl = $this->getMailActionUrl();
        $actionText = $this->getMailActionLabel();
        if ($actionUrl !== null && $actionUrl !== '') {
            $actionUrl = Str::startsWith($actionUrl, ['http://', 'https://'])
                ? $actionUrl
                : url($actionUrl);
        } else {
            $actionUrl = null;
        }

        if ($actionUrl === null || $actionUrl === '') {
            $actionText = null;
        }

        $mail = new SystemNotificationMail(
            subjectLine: $subject,
            bodyHtml: $bodyHtml,
            actionText: $actionText,
            actionUrl: $actionUrl,
            companyName: $companyName,
            logoUrl: $logoUrl,
            primaryColor: $primaryColor,
        );

        $recipient = $notifiable->routeNotificationFor('mail', $this);
        if ($recipient === null || $recipient === '') {
            return $mail;
        }

        return $mail->to($recipient);
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
