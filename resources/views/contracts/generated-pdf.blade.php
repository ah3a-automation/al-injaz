<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Contract {{ $data['contract_metadata']['contract_number'] ?? 'Document' }}</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 11px; line-height: 1.4; margin: 20px; }
        h1 { font-size: 16px; margin-bottom: 8px; }
        h2 { font-size: 13px; margin-top: 16px; margin-bottom: 6px; }
        .meta { margin-bottom: 16px; color: #444; }
        .meta p { margin: 2px 0; }
        .article { margin-top: 14px; page-break-inside: avoid; }
        .article-title { font-weight: bold; margin-bottom: 4px; }
        .article-content { margin-left: 8px; white-space: pre-wrap; }
        .source { font-size: 10px; color: #666; margin-bottom: 12px; }
        [dir="rtl"] { text-align: right; font-family: DejaVu Sans, sans-serif; }
    </style>
</head>
<body>
    <h1>Contract: {{ $data['contract_metadata']['contract_number'] ?? '—' }}</h1>
    @if (!empty($data['contract_metadata']['title_en']) || !empty($data['contract_metadata']['title_ar']))
        <p><strong>{{ $data['contract_metadata']['title_en'] ?? $data['contract_metadata']['title_ar'] ?? '' }}</strong></p>
        @if (!empty($data['contract_metadata']['title_ar']))
            <p dir="rtl">{{ $data['contract_metadata']['title_ar'] }}</p>
        @endif
    @endif
    <div class="meta">
        @if (!empty($data['contract_metadata']['contract_value']))
            <p>Value: {{ $data['contract_metadata']['contract_value'] }} {{ $data['contract_metadata']['currency'] ?? 'SAR' }}</p>
        @endif
        @if (!empty($data['contract_metadata']['start_date']))
            <p>Start: {{ $data['contract_metadata']['start_date'] }}</p>
        @endif
        @if (!empty($data['contract_metadata']['end_date']))
            <p>End: {{ $data['contract_metadata']['end_date'] }}</p>
        @endif
    </div>
    <div class="source">
        @if (!empty($data['source_metadata']['project_name']))
            <p>Project: {{ $data['source_metadata']['project_name'] }} @if(!empty($data['source_metadata']['project_code'])) ({{ $data['source_metadata']['project_code'] }}) @endif</p>
        @endif
        @if (!empty($data['source_metadata']['supplier_name']))
            <p>Supplier: {{ $data['source_metadata']['supplier_name'] }} @if(!empty($data['source_metadata']['supplier_code'])) ({{ $data['source_metadata']['supplier_code'] }}) @endif</p>
        @endif
        @if (!empty($data['source_metadata']['rfq_number']))
            <p>RFQ: {{ $data['source_metadata']['rfq_number'] }} @if(!empty($data['source_metadata']['rfq_title'])) — {{ $data['source_metadata']['rfq_title'] }} @endif</p>
        @endif
        @if ($data['generation_mode'] === 'signature_package' && !empty($data['issue_package_metadata']))
            <p><strong>Signature package</strong> — Version {{ $data['issue_package_metadata']['issue_version'] ?? '—' }} ({{ $data['issue_package_metadata']['prepared_at'] ?? '' }})</p>
        @endif
    </div>
    <h2>Articles</h2>
    @foreach ($data['articles'] as $article)
        <div class="article">
            <div class="article-title">{{ $article['article_code'] }} — {{ $article['title_en'] }}</div>
            @if (!empty($article['title_ar']))
                <p dir="rtl" class="article-title">{{ $article['title_ar'] }}</p>
            @endif
            @if (!empty($article['rendered_content_en']))
                <div class="article-content">{{ $article['rendered_content_en'] }}</div>
            @endif
            @if (!empty($article['rendered_content_ar']))
                <div class="article-content" dir="rtl">{{ $article['rendered_content_ar'] }}</div>
            @endif
        </div>
    @endforeach
</body>
</html>
