<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Support\Facades\Http;

final class GeocodingService
{
    /**
     * Geocode an address string using OpenStreetMap Nominatim (free, no API key).
     *
     * @return array{latitude: float, longitude: float}|null
     */
    public function geocode(string $address): ?array
    {
        $address = trim($address);
        if ($address === '') {
            return null;
        }

        logger()->info('Geocoding supplier address', ['address' => $address]);

        $response = Http::timeout(5)
            ->withHeaders([
                'User-Agent' => 'AlInjaz-Procurement/1.0',
            ])
            ->get(
                'https://nominatim.openstreetmap.org/search',
                [
                    'q' => $address,
                    'format' => 'json',
                    'limit' => 1,
                ]
            );

        if (! $response->successful()) {
            return null;
        }

        $data = $response->json();
        if (empty($data) || ! isset($data[0]['lat'], $data[0]['lon'])) {
            return null;
        }

        return [
            'latitude' => (float) $data[0]['lat'],
            'longitude' => (float) $data[0]['lon'],
        ];
    }
}
