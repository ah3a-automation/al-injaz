<?php

declare(strict_types=1);

namespace App\Services\Contracts;

use Carbon\Carbon;
use Illuminate\Support\Number;

/**
 * Applies locked formatters: date, datetime, currency, number, hijri_date.
 */
final class ContractVariableFormatter
{
    public function format(?string $value, string $formatter, ?string $currency = null): string
    {
        if ($value === null || $value === '') {
            return '';
        }

        return match ($formatter) {
            ContractVariableRegistry::FORMATTER_DATE => $this->date($value),
            ContractVariableRegistry::FORMATTER_DATETIME => $this->datetime($value),
            ContractVariableRegistry::FORMATTER_CURRENCY => $this->currency($value, $currency),
            ContractVariableRegistry::FORMATTER_NUMBER => $this->number($value),
            ContractVariableRegistry::FORMATTER_HIJRI_DATE => $this->hijriDateFromString($value),
            default => $value,
        };
    }

    public function date(Carbon|\DateTimeInterface|string $value): string
    {
        if (is_string($value)) {
            try {
                $value = Carbon::parse($value);
            } catch (\Throwable) {
                return $value;
            }
        }

        return $value->format('Y-m-d');
    }

    public function datetime(Carbon|\DateTimeInterface|string $value): string
    {
        if (is_string($value)) {
            try {
                $value = Carbon::parse($value);
            } catch (\Throwable) {
                return $value;
            }
        }

        return $value->format('Y-m-d H:i');
    }

    public function currency(string $value, ?string $currency = 'SAR'): string
    {
        $num = $this->numericValue($value);
        if ($num === null) {
            return $value;
        }

        return Number::format($num, 2) . ' ' . ($currency ?? 'SAR');
    }

    public function number(string $value): string
    {
        $num = $this->numericValue($value);
        if ($num === null) {
            return $value;
        }

        return Number::format($num);
    }

    public function hijriDate(Carbon|\DateTimeInterface $value): string
    {
        return $this->hijriDateFromString($value->format('Y-m-d'));
    }

    public function hijriDateFromString(string $value): string
    {
        try {
            $date = Carbon::parse($value);
        } catch (\Throwable) {
            return $value;
        }
        $y = (int) $date->format('Y');
        $m = (int) $date->format('m');
        $d = (int) $date->format('d');
        if (! function_exists('gregoriantojd') || ! function_exists('jdtoislamic')) {
            return $date->format('Y-m-d') . ' (Hijri)';
        }
        $jd = gregoriantojd($m, $d, $y);
        if ($jd === 0) {
            return $date->format('Y-m-d') . ' (Hijri)';
        }
        $islamic = jdtoislamic($jd);
        if ($islamic === '0/0/0') {
            return $date->format('Y-m-d') . ' (Hijri)';
        }
        $parts = explode('/', $islamic);
        if (count($parts) !== 3) {
            return $date->format('Y-m-d') . ' (Hijri)';
        }
        $iy = (int) $parts[2];
        $im = (int) $parts[0];
        $id = (int) $parts[1];

        return sprintf('%04d-%02d-%02d (Hijri)', $iy, $im, $id);
    }

    private function numericValue(string $value): ?float
    {
        $cleaned = preg_replace('/[^\d.-]/', '', $value);
        if ($cleaned === '' || $cleaned === '-') {
            return null;
        }
        $f = (float) $cleaned;

        return is_finite($f) ? $f : null;
    }
}
