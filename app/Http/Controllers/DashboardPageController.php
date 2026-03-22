<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Services\DashboardKpiService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;

final class DashboardPageController extends Controller
{
    public function __invoke(Request $request, DashboardKpiService $kpiService): Response
    {
        $kpis = Cache::remember('dashboard_kpis', 120, static fn (): array => $kpiService->getKpis());

        return Inertia::render('Dashboard', [
            'kpis' => $kpis,
        ]);
    }
}

