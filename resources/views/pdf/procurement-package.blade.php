@php
    /** @var \App\Models\ProcurementPackage $package */
    $branding = $branding ?? \App\Support\BrandingHelper::get();
    $documentTitle = 'Package — ' . ($package->package_no ?? $package->id);
@endphp
<!DOCTYPE html>
<html lang="{{ app()->getLocale() }}" dir="{{ app()->getLocale() === 'ar' ? 'rtl' : 'ltr' }}">
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 11px; color: #111; margin: 0; padding: 0; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #e5e7eb; padding: 6px 8px; text-align: left; }
        th { background: #f9fafb; font-weight: 600; }
        .section-title { font-size: 13px; font-weight: 700; margin: 20px 0 8px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
        .label { color: #6b7280; font-size: 10px; width: 20%; }
        .value { font-weight: 500; font-size: 11px; }
    </style>
</head>
<body>

@include('pdf.partials.header', ['branding' => $branding, 'documentTitle' => $documentTitle])

{{-- SUMMARY SECTION --}}
<div class="section-title">{{ __('admin.package_details') }}</div>
<table>
    <tr>
        <td class="label">{{ __('admin.package_number') }}</td>
        <td class="value">{{ $package->package_no ?? '—' }}</td>
        <td class="label">{{ __('admin.project') }}</td>
        <td class="value">{{ $package->project->name ?? '—' }}</td>
    </tr>
    <tr>
        <td class="label">{{ __('admin.status') }}</td>
        <td class="value">{{ $package->status }}</td>
        <td class="label">{{ __('admin.needed_by_date') }}</td>
        <td class="value">{{ $package->needed_by_date ? $package->needed_by_date->format('d M Y') : '—' }}</td>
    </tr>
    <tr>
        <td class="label">{{ __('admin.currency') }}</td>
        <td class="value">{{ $package->currency }}</td>
        <td class="label">{{ __('admin.created_by') }}</td>
        <td class="value">{{ $package->createdByUser->name ?? '—' }}</td>
    </tr>
</table>

{{-- ITEMS SECTION --}}
@if($package->boqItems && $package->boqItems->count())
<div class="section-title">{{ __('admin.items') }}</div>
<table>
    <thead>
        <tr>
            <th>{{ __('admin.code') }}</th>
            <th>{{ __('admin.description') }}</th>
            <th>{{ __('admin.unit') }}</th>
            <th>{{ __('admin.qty') }}</th>
            <th>{{ __('admin.revenue_amount') }}</th>
            <th>{{ __('admin.planned_cost') }}</th>
        </tr>
    </thead>
    <tbody>
        @foreach($package->boqItems as $item)
        <tr>
            <td>{{ $item->code }}</td>
            <td>{{ $item->description_en }}</td>
            <td>{{ $item->unit }}</td>
            <td>{{ $item->qty }}</td>
            <td>{{ $item->revenue_amount }}</td>
            <td>{{ $item->planned_cost }}</td>
        </tr>
        @endforeach
    </tbody>
</table>
@endif

{{-- ATTACHMENTS SECTION --}}
@if($package->attachments && $package->attachments->count())
<div class="section-title">{{ __('admin.attachments') }}</div>
<table>
    <thead>
        <tr>
            <th>{{ __('admin.filename') }}</th>
            <th>{{ __('admin.document_type') }}</th>
        </tr>
    </thead>
    <tbody>
        @foreach($package->attachments as $att)
        <tr>
            <td>{{ $att->title ?? basename($att->file_path ?? '') }}</td>
            <td>{{ $att->document_type ?? 'other' }}</td>
        </tr>
        @endforeach
    </tbody>
</table>
@endif

@include('pdf.partials.footer', ['branding' => $branding])

</body>
</html>

