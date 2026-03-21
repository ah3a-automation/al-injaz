<?php

declare(strict_types=1);

namespace App\Support;

/**
 * Best-effort KSA phone normalization for supplier master data and contacts.
 * Uses {@see WhatsAppPhoneNormalizer} when possible; otherwise stores a lightly cleaned value.
 */
final class SupplierPhoneNormalizer
{
    /**
     * Normalize nullable phone/mobile for persistence (e.g. 9665XXXXXXXX).
     * Returns null for null/empty input. If the value cannot be normalized to KSA international form,
     * returns a non-empty best-effort string (digits and optional leading +) or the trimmed original.
     */
    public static function normalize(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $trimmed = trim($value);
        if ($trimmed === '') {
            return null;
        }

        $normalized = WhatsAppPhoneNormalizer::normalize($trimmed);
        if ($normalized !== '') {
            return $normalized;
        }

        $digitsOnly = preg_replace('/\D+/', '', $trimmed) ?? '';
        if ($digitsOnly !== '') {
            return $digitsOnly;
        }

        return $trimmed;
    }
}
