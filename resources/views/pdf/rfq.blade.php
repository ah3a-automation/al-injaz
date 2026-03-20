@php
    /** @var \App\Models\Rfq $rfq */
    $branding = $branding ?? \App\Support\BrandingHelper::get();
    $documentTitle = 'RFQ — ' . ($rfq->rfq_number ?? $rfq->id);
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
<div class="section-title">{{ __('rfqs.rfq_details') }}</div>
<table>
    <tr>
        <td class="label">{{ __('rfqs.reference') }}</td>
        <td class="value">{{ $rfq->rfq_number ?? $rfq->id }}</td>
        <td class="label">{{ __('rfqs.project') }}</td>
        <td class="value">{{ $rfq->project->name ?? '—' }}</td>
    </tr>
    <tr>
        <td class="label">{{ __('rfqs.status') }}</td>
        <td class="value">{{ $rfq->status }}</td>
        <td class="label">{{ __('rfqs.deadline') }}</td>
        <td class="value">{{ $rfq->submission_deadline ? $rfq->submission_deadline->format('d M Y') : '—' }}</td>
    </tr>
    <tr>
        <td class="label">{{ __('rfqs.currency') }}</td>
        <td class="value">{{ $rfq->currency }}</td>
        <td class="label">{{ __('rfqs.created_by') }}</td>
        <td class="value">{{ $rfq->createdBy->name ?? '—' }}</td>
    </tr>
</table>

{{-- SUPPLIERS SECTION --}}
@if($rfq->suppliers && $rfq->suppliers->count())
<div class="section-title">{{ __('rfqs.invited_suppliers') }}</div>
<table>
    <thead>
        <tr>
            <th>{{ __('rfqs.supplier_name') }}</th>
            <th>{{ __('rfqs.status') }}</th>
        </tr>
    </thead>
    <tbody>
        @foreach($rfq->suppliers as $pivot)
        <tr>
            <td>{{ $pivot->supplier->legal_name_en ?? '—' }}</td>
            <td>{{ $pivot->status ?? '—' }}</td>
        </tr>
        @endforeach
    </tbody>
</table>
@endif

{{-- ITEMS / BOQ SECTION --}}
@if($rfq->items && $rfq->items->count())
<div class="section-title">{{ __('rfqs.items') }}</div>
<table>
    <thead>
        <tr>
            <th>{{ __('rfqs.code') }}</th>
            <th>{{ __('rfqs.description') }}</th>
            <th>{{ __('rfqs.unit') }}</th>
            <th>{{ __('rfqs.qty') }}</th>
        </tr>
    </thead>
    <tbody>
        @foreach($rfq->items as $item)
        <tr>
            <td>{{ $item->code }}</td>
            <td>{{ $item->description_en }}</td>
            <td>{{ $item->unit }}</td>
            <td>{{ $item->qty }}</td>
        </tr>
        @endforeach
    </tbody>
</table>
@endif

{{-- ATTACHMENTS SECTION --}}
@if($rfq->documents && $rfq->documents->count())
<div class="section-title">{{ __('rfqs.attachments') }}</div>
<table>
    <thead>
        <tr>
            <th>{{ __('rfqs.filename') }}</th>
            <th>{{ __('rfqs.type') }}</th>
        </tr>
    </thead>
    <tbody>
        @foreach($rfq->documents as $doc)
        <tr>
            <td>{{ $doc->title ?? basename($doc->file_path ?? '') }}</td>
            <td>{{ $doc->document_type ?? '—' }}</td>
        </tr>
        @endforeach
    </tbody>
</table>
@endif

@include('pdf.partials.footer', ['branding' => $branding])

</body>
</html>

