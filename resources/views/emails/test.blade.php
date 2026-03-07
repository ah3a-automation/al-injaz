@component('mail::message')
# Email Configuration Test

This is a test email from **Al Injaz**.

Your SMTP configuration is working correctly.

**Sent to:** {{ $sentTo }}

**Sent at:** {{ now()->format('Y-m-d H:i:s') }}

@component('mail::button', ['url' => config('app.url')])
Open Al Injaz
@endcomponent

Thanks,
**Al Injaz System**
@endcomponent
