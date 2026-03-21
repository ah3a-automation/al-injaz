<?php

declare(strict_types=1);

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

final class SaudiVatNumber implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if ($value === null || $value === '') {
            return;
        }

        if (! is_string($value)) {
            $fail(__('suppliers.vat_format_invalid'));

            return;
        }

        $digits = preg_replace('/\D+/', '', $value) ?? '';

        if (strlen($digits) !== 15 || $digits[0] !== '3' || $digits[14] !== '3') {
            $fail(__('suppliers.vat_format_invalid'));
        }
    }
}
