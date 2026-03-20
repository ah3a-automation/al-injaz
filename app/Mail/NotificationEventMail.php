<?php

declare(strict_types=1);

namespace App\Mail;

use App\Support\BrandingHelper;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

final class NotificationEventMail extends Mailable
{
    use Queueable;
    use SerializesModels;

    public function __construct(
        public readonly string $subjectLine,
        public readonly string $messageLine,
        public readonly ?string $actionUrl = null,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->subjectLine,
        );
    }

    /**
     * @return Content
     */
    public function content(): Content
    {
        $branding = BrandingHelper::get();

        return new Content(
            markdown: 'emails.notification_event',
            with: [
                'branding' => $branding,
                'title' => $this->subjectLine,
                'message' => $this->messageLine,
                'actionUrl' => $this->actionUrl,
            ],
        );
    }
}

