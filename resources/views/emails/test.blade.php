@extends('emails.layout')

@section('content')
    <h1 style="font-size:20px; margin-bottom:12px;">Email Configuration Test</h1>

    <p>This is a test email from <strong>{{ $branding['display_name'] }}</strong>.</p>

    <p>Your SMTP configuration is working correctly.</p>

    <p><strong>Sent to:</strong> {{ $sentTo }}</p>
    <p><strong>Sent at:</strong> {{ now()->format('Y-m-d H:i:s') }}</p>

    <p style="margin-top:24px;">
        <a href="{{ config('app.url') }}"
           style="display:inline-block; padding:10px 18px; border-radius:9999px; background:{{ $branding['brand_primary_color'] ?? '#1a56db' }}; color:#ffffff; text-decoration:none; font-weight:600;">
            Open {{ $branding['display_name'] }}
        </a>
    </p>

    <p style="margin-top:24px;">Thanks,<br>{{ $branding['display_name'] }}</p>
@endsection
