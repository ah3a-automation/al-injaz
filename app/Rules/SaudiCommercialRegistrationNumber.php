<?php

declare(strict_types=1);

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

final class SaudiCommercialRegistrationNumber implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if ($value === null || $value === '') {
            return;
        }

        if (! is_string($value)) {
            $fail(__('suppliers.cr_format_invalid'));

            return;
        }

        $digits = preg_replace('/\D+/', '', $value) ?? '';

        if (strlen($digits) !== 10) {
            $fail(__('suppliers.cr_format_invalid'));
        }
    }
}
