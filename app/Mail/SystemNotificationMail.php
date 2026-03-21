<?php

declare(strict_types=1);

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

final class SystemNotificationMail extends Mailable
{
    use Queueable;
    use SerializesModels;

    public function __construct(
        public string $subjectLine,
        public string $bodyHtml,
        public ?string $actionText,
        public ?string $actionUrl,
        public string $companyName,
        public ?string $logoUrl = null,
        public string $primaryColor = '#373d42',
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->subjectLine,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.notification',
            with: [
                'subjectLine' => $this->subjectLine,
                'bodyHtml' => $this->bodyHtml,
                'actionText' => $this->actionText,
                'actionUrl' => $this->actionUrl,
                'companyName' => $this->companyName,
                'logoUrl' => $this->logoUrl,
                'primaryColor' => $this->primaryColor,
            ],
        );
    }
}
