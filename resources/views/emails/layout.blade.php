@php
    /** @var array{display_name:string,logo:string|null,brand_primary_color:string} $branding */
@endphp
<!DOCTYPE html>
<html lang="{{ app()->getLocale() }}" dir="{{ app()->getLocale() === 'ar' ? 'rtl' : 'ltr' }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin:0; padding:0; background:#f3f4f6; }
        .email-wrapper { max-width:600px; margin:32px auto; background:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.1); }
        .email-body { padding:32px; color:#111827; line-height:1.6; font-size:15px; }
        h1,h2,h3 { color:#111827; margin-top:0; }
        a { color:{{ $branding['brand_primary_color'] ?? '#1a56db' }}; }
    </style>
</head>
<body>
    <div class="email-wrapper">
        @include('emails.partials.header', ['branding' => $branding])
        <div class="email-body">
            @yield('content')
        </div>
        @include('emails.partials.footer', ['branding' => $branding])
    </div>
</body>
</html>

