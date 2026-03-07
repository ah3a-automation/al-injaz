<?php

declare(strict_types=1);

namespace App\Constants;

final class SaudiZones
{
    public const ZONES = [
        'RYD' => 'Riyadh',
        'JED' => 'Makkah / Jeddah',
        'DAM' => 'Eastern Province / Dammam',
        'MED' => 'Madinah',
        'ABH' => 'Asir / Abha',
        'TAI' => 'Taif',
        'BUR' => 'Al-Qassim / Buraydah',
        'HAI' => 'Hail',
        'JAZ' => 'Jizan',
        'NAJ' => 'Najran',
        'JOF' => 'Al-Jouf',
        'NOR' => 'Northern Borders',
        'BAH' => 'Al-Bahah',
    ];

    /**
     * @return array<string, string>
     */
    public static function all(): array
    {
        return self::ZONES;
    }

    public static function getName(string $code): string
    {
        return self::ZONES[$code] ?? $code;
    }
}
