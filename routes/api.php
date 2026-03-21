<?php

declare(strict_types=1);

use App\Http\Controllers\Api\SupplierIntelligenceApiController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'throttle:api'])->group(function () {
    Route::get('/suppliers/{supplier}/intelligence', [SupplierIntelligenceApiController::class, 'show'])
        ->name('api.suppliers.intelligence');
});
