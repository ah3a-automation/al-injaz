<?php

declare(strict_types=1);

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

final class CityBelongsToCountry implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if ($value === null || $value === '') {
            return;
        }

        $country = request()->input('country');
        if ($country === null || $country === '') {
            return;
        }

        $countries = config('locations.countries', []);
        if (! isset($countries[$country])) {
            return;
        }

        $allowedCities = $countries[$country];
        if (! in_array($value, $allowedCities, true)) {
            $fail('The selected city is not valid for the selected country.');
        }
    }
}
