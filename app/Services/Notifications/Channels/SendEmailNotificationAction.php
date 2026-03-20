<?php

declare(strict_types=1);

namespace App\Services\Notifications\Channels;

use App\Mail\NotificationEventMail;
use App\Services\Notifications\NotificationDispatchChannelPlan;
use App\Services\Notifications\NotificationEventContext;
use Illuminate\Contracts\Mail\Mailer;

final class SendEmailNotificationAction
{
    public function __construct(
        private readonly Mailer $mailer,
    ) {}

    public function execute(string $emittedEventKey, NotificationDispatchChannelPlan $plan, NotificationEventContext $context): int
    {
        $recipientEmails = [];
        foreach ($plan->recipients as $recipient) {
            if ($recipient->email !== null) {
                $recipientEmails[] = $recipient->email;
            }
        }

        // Dedupe by lowercase email address to prevent accidental duplicates
        // when multiple recipient rules resolve to the same inbox.
        $normalized = [];
        foreach ($recipientEmails as $email) {
            if (! is_string($email)) {
                continue;
            }

            $e = mb_strtolower(trim($email));
            if ($e === '') {
                continue;
            }

            if (filter_var($e, FILTER_VALIDATE_EMAIL) === false) {
                continue;
            }

            $normalized[$e] = true;
        }

        $recipientEmails = array_keys($normalized);

        if ($recipientEmails === []) {
            return 0;
        }

        $subject = $context->getTitle() ?? $emittedEventKey;
        $message = $context->getMessage() ?? '';
        $actionUrl = $context->getLink();

        if (is_string($actionUrl) && $actionUrl !== '') {
            $isAbsolute = str_starts_with($actionUrl, 'http://')
                || str_starts_with($actionUrl, 'https://');

            // Pilot events currently pass both relative links (e.g. `/rfqs/{id}`) and
            // full route URLs. Normalize to an absolute URL for email clients.
            if (! $isAbsolute) {
                $actionUrl = url($actionUrl);
            }
        }

        $sent = 0;
        foreach ($recipientEmails as $email) {
            try {
                $this->mailer->to($email)->send(
                    new NotificationEventMail(
                        subjectLine: $subject,
                        messageLine: $message,
                        actionUrl: $actionUrl,
                    )
                );

                $sent++;
            } catch (\Throwable $e) {
                logger()->warning('SendEmailNotificationAction: failed to send notification email', [
                    'event_key' => $emittedEventKey,
                    'email' => $email,
                    'exception' => $e->getMessage(),
                ]);
            }
        }

        logger()->debug('SendEmailNotificationAction: email dispatch complete', [
            'event_key' => $emittedEventKey,
            'sent_count' => $sent,
        ]);

        return $sent;
    }
}

