<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Services\DashboardKpiService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

final class DashboardPageController extends Controller
{
    public function __invoke(Request $request, DashboardKpiService $kpiService): Response
    {
        return Inertia::render('Dashboard', [
            'kpis' => $kpiService->getKpis(),
        ]);
    }
}

