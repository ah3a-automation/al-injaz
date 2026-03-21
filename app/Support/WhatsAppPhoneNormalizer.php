<?php

declare(strict_types=1);

namespace App\Support;

/**
 * Normalizes phone numbers for WhatsApp / Evolution API (digits only, international, KSA-aware).
 */
final class WhatsAppPhoneNormalizer
{
    /**
     * Returns international digits without leading + (e.g. 966501234567) or empty string if unusable.
     */
    public static function normalize(string $phone): string
    {
        $trimmed = trim($phone);
        if ($trimmed === '') {
            return '';
        }

        $hasPlus = str_starts_with($trimmed, '+');
        $digits = preg_replace('/\D+/', '', $hasPlus ? substr($trimmed, 1) : $trimmed) ?? '';

        if ($digits === '') {
            return '';
        }

        // Saudi Arabia: 05XXXXXXXX → 9665XXXXXXXX
        if (str_starts_with($digits, '0') && strlen($digits) >= 10) {
            $digits = substr($digits, 1);
        }

        if (str_starts_with($digits, '966')) {
            return $digits;
        }

        // 9-digit mobile starting with 5 (KSA)
        if (strlen($digits) === 9 && str_starts_with($digits, '5')) {
            return '966' . $digits;
        }

        // 10-digit local starting with 5 (e.g. 5XXXXXXXXX)
        if (strlen($digits) === 10 && str_starts_with($digits, '5')) {
            return '966' . $digits;
        }

        // Already long international — keep digits
        if (strlen($digits) >= 10) {
            return $digits;
        }

        return $digits;
    }
}
