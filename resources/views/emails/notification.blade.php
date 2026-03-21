<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>{{ $subjectLine }}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:16px;line-height:1.6;color:#1f2937;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f4f4f5;padding:24px 12px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;margin:0 auto;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
                    <tr>
                        <td style="background-color:{{ $primaryColor }};padding:20px 24px;text-align:center;">
                            @if(!empty($logoUrl))
                                <img src="{{ $logoUrl }}" alt="{{ $companyName }}" width="160" height="auto" style="display:inline-block;max-width:160px;height:auto;border:0;outline:none;text-decoration:none;">
                            @else
                                <span style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;">{{ $companyName }}</span>
                            @endif
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:28px 24px 8px 24px;">
                            <p style="margin:0 0 16px 0;font-size:16px;color:#374151;">Hello,</p>
                            <div style="font-size:15px;color:#374151;line-height:1.65;">
                                {!! $bodyHtml !!}
                            </div>
                            @if(!empty($actionText) && !empty($actionUrl))
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0 8px 0;">
                                    <tr>
                                        <td align="center" style="border-radius:6px;background-color:{{ $primaryColor }};">
                                            <a href="{{ $actionUrl }}" style="display:inline-block;padding:12px 24px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:6px;background-color:{{ $primaryColor }};">{{ $actionText }}</a>
                                        </td>
                                    </tr>
                                </table>
                            @endif
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:16px 24px 28px 24px;border-top:1px solid #e5e7eb;">
                            <p style="margin:0;font-size:13px;color:#9ca3af;text-align:center;">{{ $companyName }}</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
