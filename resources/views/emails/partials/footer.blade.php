@php
    /** @var array{display_name:string,website:string|null} $branding */
@endphp
<div style="background:#f9fafb; padding:16px 32px; border-top:1px solid #e5e7eb; text-align:center; font-size:12px; color:#6b7280;">
    <p style="margin:0;">{{ $branding['display_name'] }}</p>
    @if(!empty($branding['website']))
        <p style="margin:4px 0 0;">{{ $branding['website'] }}</p>
    @endif
</div>

