<?php

return [

'show_warnings' => false,
'public_path' => null,
'convert_entities' => true,

'options' => [

    'font_dir' => storage_path('fonts'),

    'font_cache' => storage_path('fonts'),

    // FIX: DomPDF needs its own writable temp directory
    'temp_dir' => storage_path('dompdf-temp'),

    // FIX: chroot must allow DomPDF to access views/assets
    'chroot' => base_path(),

    'allowed_protocols' => [
        'data://' => ['rules' => []],
        'file://' => ['rules' => []],
        'http://' => ['rules' => []],
        'https://' => ['rules' => []],
    ],

    // FIX: allow artifact files
    'artifactPathValidation' => false,

    'log_output_file' => storage_path('logs/dompdf.html'),

    'enable_font_subsetting' => true,

    'isHtml5ParserEnabled' => true,

    'pdf_backend' => 'CPDF',

    'default_media_type' => 'screen',

    'default_paper_size' => 'a4',

    'default_paper_orientation' => 'portrait',

    'default_font' => 'serif',

    'dpi' => 96,

    'enable_php' => false,

    'enable_javascript' => true,

    'enable_remote' => false,

    'allowed_remote_hosts' => null,

    'font_height_ratio' => 1.1,

    'enable_html5_parser' => true,

],

];