@extends('emails.layout')

@section('content')
    <h1 style="font-size:20px; margin-bottom:12px;">{{ $title }}</h1>

    @if(!empty($message))
        <p style="margin:0; white-space:pre-wrap;">{{ $message }}</p>
    @else
        <p style="margin:0; color:#6b7280;">(No message)</p>
    @endif

    @if(!empty($actionUrl))
        <p style="margin-top:24px;">
            <a href="{{ $actionUrl }}"
               style="display:inline-block; padding:10px 18px; border-radius:9999px; background:{{ $branding['brand_primary_color'] ?? '#1a56db' }}; color:#ffffff; text-decoration:none; font-weight:600;">
                Open details
            </a>
        </p>
    @endif

    <p style="margin-top:24px;">Thanks,<br>{{ $branding['display_name'] }}</p>
@endsection

