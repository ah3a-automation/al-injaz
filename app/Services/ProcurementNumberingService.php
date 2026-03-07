<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\ProcurementPackage;
use App\Models\ProcurementRequest;
use App\Models\Project;
use Illuminate\Support\Facades\DB;

class ProcurementNumberingService
{
    /**
     * Generate next package number for the project.
     * Format: {PROJECT_CODE}-PKG-001 or PKG-{project_id_prefix}-001 if no code.
     */
    public function nextPackageNo(Project $project): string
    {
        $prefix = $this->projectPrefixForPackage($project);
        $pattern = $prefix . '-PKG-%';
        $maxSeq = (int) ProcurementPackage::query()
            ->where('project_id', $project->id)
            ->whereNotNull('package_no')
            ->where('package_no', 'like', $pattern)
            ->selectRaw("COALESCE(MAX(CAST(SUBSTRING(package_no FROM '[0-9]+$') AS INTEGER)), 0) AS n")
            ->value('n');

        $next = $maxSeq + 1;

        return $prefix . '-PKG-' . str_pad((string) $next, 3, '0', STR_PAD_LEFT);
    }

    /**
     * Generate next RFQ/request number for the package's project.
     * Format: {PROJECT_CODE}-RFQ-001
     */
    public function nextRequestNo(ProcurementPackage $package): string
    {
        $project = $package->project;
        $prefix = $this->projectPrefixForRequest($project);
        $pattern = $prefix . '-RFQ-%';
        $maxSeq = (int) ProcurementRequest::query()
            ->join('procurement_packages', 'procurement_requests.package_id', '=', 'procurement_packages.id')
            ->where('procurement_packages.project_id', $project->id)
            ->where('procurement_requests.request_no', 'like', $pattern)
            ->selectRaw("COALESCE(MAX(CAST(SUBSTRING(procurement_requests.request_no FROM '[0-9]+$') AS INTEGER)), 0) AS n")
            ->value('n');

        $next = $maxSeq + 1;

        return $prefix . '-RFQ-' . str_pad((string) $next, 3, '0', STR_PAD_LEFT);
    }

    private function projectPrefixForPackage(Project $project): string
    {
        $code = $project->code ?? null;
        if ($code !== null && $code !== '') {
            return $this->sanitizeCode((string) $code);
        }

        return 'PKG-' . substr($project->id, 0, 8);
    }

    private function projectPrefixForRequest(Project $project): string
    {
        $code = $project->code ?? null;
        if ($code !== null && $code !== '') {
            return $this->sanitizeCode((string) $code);
        }

        return substr($project->id, 0, 8);
    }

    private function sanitizeCode(string $code): string
    {
        $code = preg_replace('/[^A-Za-z0-9_-]/', '', $code);

        return $code !== '' ? strtoupper(substr($code, 0, 20)) : 'PRJ';
    }
}
