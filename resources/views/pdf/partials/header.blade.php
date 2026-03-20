@php
    /** @var array{display_name:string,logo:string|null,brand_primary_color:string} $branding */
@endphp
<div style="padding:16px 24px; border-bottom:2px solid {{ $branding['brand_primary_color'] ?? '#1a56db' }}; margin-bottom:24px; display:flex; align-items:center; justify-content:space-between;">
    <div>
        @if(!empty($branding['logo']))
            <img src="{{ public_path($branding['logo']) }}" alt="{{ $branding['display_name'] }}"
                 style="height:40px; max-width:160px; object-fit:contain;">
        @else
            <span style="font-size:18px; font-weight:700; color:{{ $branding['brand_primary_color'] ?? '#1a56db' }};">
                {{ $branding['display_name'] }}
            </span>
        @endif
    </div>
    <div style="text-align:right; font-size:11px; color:#6b7280;">
        {{ $documentTitle ?? '' }}
    </div>
</div>

