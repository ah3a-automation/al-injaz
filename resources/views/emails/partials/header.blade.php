@php
    /** @var array{display_name:string,logo:string|null,brand_primary_color:string} $branding */
@endphp
<div style="background:#ffffff; padding:24px 32px; border-bottom:3px solid {{ $branding['brand_primary_color'] ?? '#1a56db' }};">
    @if(!empty($branding['logo']))
        <img src="{{ asset($branding['logo']) }}" alt="{{ $branding['display_name'] }}"
             style="height:48px; max-width:200px; object-fit:contain;">
    @else
        <span style="font-size:20px; font-weight:700; color:{{ $branding['brand_primary_color'] ?? '#1a56db' }};">
            {{ $branding['display_name'] }}
        </span>
    @endif
</div>

