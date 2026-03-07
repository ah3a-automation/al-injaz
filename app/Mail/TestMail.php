<?php

declare(strict_types=1);

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class TestMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $sentTo
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Al Injaz — Test Email Configuration'
        );
    }

    /**
     * @return array<string, string>
     */
    public function content(): Content
    {
        return new Content(
            markdown: 'emails.test',
            with: ['sentTo' => $this->sentTo]
        );
    }
}
