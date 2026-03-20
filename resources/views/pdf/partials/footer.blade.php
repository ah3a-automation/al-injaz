@php
    /** @var array{display_name:string} $branding */
@endphp
<div style="border-top:1px solid #e5e7eb; padding:8px 24px; margin-top:24px; font-size:10px; color:#9ca3af; display:flex; justify-content:space-between;">
    <span>{{ $branding['display_name'] }}</span>
    <span>{{ now()->format('d M Y') }}</span>
</div>

