<?php

declare(strict_types=1);

return [
    /*
    |--------------------------------------------------------------------------
    | Quantity Tracking
    |--------------------------------------------------------------------------
    | When enabled, prevents consumed_qty from exceeding qty_allocated on
    | package_boq_items. Optional per Session 11D governance.
    */
    'qty_tracking_enabled' => env('BOQ_QTY_TRACKING_ENABLED', false),
];
