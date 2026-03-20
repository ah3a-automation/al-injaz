<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Support\Facades\Http;

final class ReverseGeocodingService
{
    /**
     * Reverse geocode coordinates to address using OpenStreetMap Nominatim.
     *
     * @return array{address: string|null, city: string|null, country: string|null}|null
     */
    public function reverse(float $latitude, float $longitude): ?array
    {
        $response = Http::timeout(5)
            ->withHeaders([
                'User-Agent' => 'AlInjaz-Procurement/1.0',
            ])
            ->get(
                'https://nominatim.openstreetmap.org/reverse',
                [
                    'lat' => $latitude,
                    'lon' => $longitude,
                    'format' => 'json',
                ]
            );

        if (! $response->successful()) {
            return null;
        }

        $data = $response->json();
        if (empty($data) || ! isset($data['address'])) {
            return null;
        }

        $addr = $data['address'];

        $addressParts = array_filter([
            $addr['house_number'] ?? null,
            $addr['road'] ?? null,
            $addr['suburb'] ?? $addr['neighbourhood'] ?? null,
        ]);
        $address = ! empty($addressParts) ? implode(', ', $addressParts) : ($addr['road'] ?? null);

        $city = $addr['city']
            ?? $addr['town']
            ?? $addr['village']
            ?? $addr['municipality']
            ?? $addr['county']
            ?? null;

        $country = $addr['country'] ?? null;

        return [
            'address' => $address ? (string) $address : null,
            'city' => $city ? (string) $city : null,
            'country' => $country ? (string) $country : null,
        ];
    }
}
