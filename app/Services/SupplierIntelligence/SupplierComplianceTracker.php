<?php

declare(strict_types=1);

namespace App\Services\SupplierIntelligence;

use App\Models\Supplier;
use Carbon\Carbon;

final class SupplierComplianceTracker
{
    private const EXPIRING_SOON_DAYS = 30;

    /**
     * @return array{
     *     status: 'compliant'|'expiring_soon'|'non_compliant',
     *     compliance_score: int,
     *     cr: array{valid: bool, expiry_date: ?string, status: string},
     *     vat: array{valid: bool, expiry_date: ?string, status: string},
     *     insurance: array{valid: bool, expiry_date: ?string, status: string},
     *     certifications: array<int, array{name: string, expiry_date: ?string, status: string}>,
     *     documents_expired: array<int, array{type: string, expiry_date: ?string}>,
     *     alerts: array<int, array{type: string, days_remaining?: int}>,
     * }
     */
    public function getCompliance(Supplier $supplier): array
    {
        $today = Carbon::today();
        $soon = $today->copy()->addDays(self::EXPIRING_SOON_DAYS);

        $cr = $this->checkDate($supplier->cr_expiry_date, $today, $soon, 'CR');
        $vat = $this->checkDate(
            $supplier->vat_expiry_date ?? $this->getVatExpiryFromDocuments($supplier),
            $today,
            $soon,
            'VAT'
        );
        $insurance = $this->checkDate($supplier->insurance_expiry_date ?? $this->getInsuranceExpiryFromDocuments($supplier), $today, $soon, 'Insurance');

        $certifications = [];
        foreach ($supplier->certifications()->get() as $cert) {
            $expiryRaw = $cert->pivot->expires_at ?? null;
            $expiry = $expiryRaw ? Carbon::parse($expiryRaw) : null;
            $certifications[] = [
                'name' => $cert->name,
                'expiry_date' => $expiry?->format('Y-m-d'),
                'status' => $this->dateStatus($expiry, $today, $soon),
            ];
        }

        $documentsExpired = [];
        foreach ($supplier->documents()->whereNotNull('expiry_date')->get() as $doc) {
            $expiry = $doc->expiry_date ? Carbon::parse($doc->expiry_date) : null;
            if ($expiry && $expiry->isPast()) {
                $documentsExpired[] = [
                    'type' => $doc->document_type,
                    'expiry_date' => $doc->expiry_date?->format('Y-m-d'),
                ];
            }
        }

        $overallStatus = 'compliant';
        if (! $cr['valid'] || ! $vat['valid'] || ! $insurance['valid'] || count($documentsExpired) > 0) {
            $overallStatus = 'non_compliant';
        } elseif ($cr['status'] === 'expiring_soon' || $vat['status'] === 'expiring_soon' || $insurance['status'] === 'expiring_soon') {
            $overallStatus = 'expiring_soon';
        }
        foreach ($certifications as $c) {
            if ($c['status'] === 'expired') {
                $overallStatus = 'non_compliant';
                break;
            }
            if ($c['status'] === 'expiring_soon' && $overallStatus === 'compliant') {
                $overallStatus = 'expiring_soon';
            }
        }

        $complianceScore = 0;
        if ($cr['status'] !== 'expired') {
            $complianceScore += 25;
        }
        if ($vat['status'] !== 'expired') {
            $complianceScore += 25;
        }
        if ($insurance['status'] !== 'expired') {
            $complianceScore += 25;
        }
        $certsValid = count($certifications) === 0 || ! in_array('expired', array_column($certifications, 'status'), true);
        if ($certsValid) {
            $complianceScore += 25;
        }

        $alerts = $this->buildAlerts($cr, $vat, $insurance, $certifications, $documentsExpired, $today);

        return [
            'status' => $overallStatus,
            'compliance_score' => $complianceScore,
            'cr' => $cr,
            'vat' => $vat,
            'insurance' => $insurance,
            'certifications' => $certifications,
            'documents_expired' => $documentsExpired,
            'alerts' => $alerts,
        ];
    }

    /**
     * @param array{expiry_date: ?string, status: string} $cr
     * @param array{expiry_date: ?string, status: string} $vat
     * @param array{expiry_date: ?string, status: string} $insurance
     * @param array<int, array{expiry_date: ?string, status: string}> $certifications
     * @param array<int, array{type: string, expiry_date: ?string}> $documentsExpired
     * @return array<int, array{type: string, days_remaining?: int}>
     */
    private function buildAlerts(array $cr, array $vat, array $insurance, array $certifications, array $documentsExpired, Carbon $today): array
    {
        $alerts = [];
        if ($cr['status'] === 'expiring_soon' && $cr['expiry_date']) {
            $expiry = Carbon::parse($cr['expiry_date'])->startOfDay();
            $daysRemaining = (int) $today->copy()->startOfDay()->diffInDays($expiry, false);
            if ($daysRemaining < 0) {
                $daysRemaining = 0;
            }
            $alerts[] = ['type' => 'cr_expiring', 'days_remaining' => $daysRemaining];
        }
        if ($vat['status'] === 'expired') {
            $alerts[] = ['type' => 'vat_expired'];
        }
        if ($insurance['status'] === 'expiring_soon' || $insurance['status'] === 'expired') {
            $alerts[] = ['type' => $insurance['status'] === 'expired' ? 'insurance_expired' : 'insurance_expiring'];
        }
        foreach ($certifications as $c) {
            if ($c['status'] === 'expired') {
                $alerts[] = ['type' => 'certification_expired'];
                break;
            }
            if ($c['status'] === 'expiring_soon') {
                $alerts[] = ['type' => 'certification_expiring'];
                break;
            }
        }
        if (count($documentsExpired) > 0) {
            $alerts[] = ['type' => 'document_expired'];
        }
        return $alerts;
    }

    /**
     * @param \Carbon\Carbon|\DateTimeInterface|string|null $date
     */
    private function checkDate($date, Carbon $today, Carbon $soon, string $label): array
    {
        $d = $date ? Carbon::parse($date) : null;
        $status = $this->dateStatus($d, $today, $soon);
        return [
            'valid' => $d === null || $d->isFuture(),
            'expiry_date' => $d?->format('Y-m-d'),
            'status' => $status,
        ];
    }

    private function dateStatus(?\Carbon\Carbon $date, Carbon $today, Carbon $soon): string
    {
        if ($date === null) {
            return 'no_expiry';
        }
        if ($date->isPast()) {
            return 'expired';
        }
        if ($date->lte($soon)) {
            return 'expiring_soon';
        }
        return 'valid';
    }

    private function getVatExpiryFromDocuments(Supplier $supplier): ?string
    {
        $doc = $supplier->documents()
            ->where('document_type', 'vat_certificate')
            ->whereNotNull('expiry_date')
            ->orderByDesc('expiry_date')
            ->first();
        return $doc?->expiry_date?->format('Y-m-d');
    }

    private function getInsuranceExpiryFromDocuments(Supplier $supplier): ?string
    {
        $doc = $supplier->documents()
            ->where('document_type', 'other')
            ->whereNotNull('expiry_date')
            ->orderByDesc('expiry_date')
            ->first();
        return $doc?->expiry_date?->format('Y-m-d');
    }
}
