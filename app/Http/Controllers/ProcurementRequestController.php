<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\ProcurementPackage;
use App\Models\ProcurementRequest;
use App\Services\ActivityLogger;
use App\Services\ProcurementNumberingService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProcurementRequestController extends Controller
{
    public function __construct(
        private readonly ActivityLogger $activityLogger,
        private readonly ProcurementNumberingService $numberingService,
    ) {}

    public function store(Request $request, ProcurementPackage $package): RedirectResponse
    {
        $this->authorize('update', $package->project);

        $requestNo = DB::transaction(function () use ($package): string {
            return $this->numberingService->nextRequestNo($package);
        });

        $procurementRequest = $package->requests()->create([
            'request_no' => $requestNo,
            'status'     => ProcurementRequest::STATUS_DRAFT,
            'created_by' => $request->user()->id,
        ]);

        $this->activityLogger->log('procurement_request.created', $procurementRequest, [], $procurementRequest->toArray(), $request->user());

        return back()->with('success', 'RFQ created: ' . $procurementRequest->request_no);
    }
}
