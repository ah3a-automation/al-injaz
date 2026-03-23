<?php

declare(strict_types=1);

return [
    /*
    |--------------------------------------------------------------------------
    | Supplier RFQ quotation — large BOQ list rendering
    |--------------------------------------------------------------------------
    |
    | When an RFQ has more line items than chunk_threshold, the supplier portal
    | renders the quotation table in client-side chunks (see Show.tsx) to limit
    | DOM size. Form state remains keyed by item id in memory; draft/submit
    | payloads still include all items.
    |
    */
    'rfq_quote_items' => [
        'chunk_threshold' => max(1, (int) env('SUPPLIER_RFQ_QUOTE_ITEMS_CHUNK_THRESHOLD', 50)),
        'chunk_size' => max(1, (int) env('SUPPLIER_RFQ_QUOTE_ITEMS_CHUNK_SIZE', 25)),
    ],
];
