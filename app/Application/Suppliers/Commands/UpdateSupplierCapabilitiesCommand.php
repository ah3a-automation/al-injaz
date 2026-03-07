<?php

declare(strict_types=1);

namespace App\Application\Suppliers\Commands;

use App\Constants\SaudiZones;
use App\Models\Supplier;
use Illuminate\Support\Facades\DB;

final class UpdateSupplierCapabilitiesCommand
{
    /**
     * @param array<int, array{id: int, proficiency_level?: string, years_experience?: int|null}> $capabilities
     * @param array<int, array{certificate_number?: string|null, issued_at?: string|null, expires_at?: string|null}> $certifications
     * @param array<int, string> $zoneCodes
     * @param array{max_contract_value?: mixed, workforce_size?: mixed, equipment_list?: mixed, capacity_notes?: mixed} $capacityData
     */
    public function __construct(
        private readonly Supplier $supplier,
        private readonly array $capabilities,
        private readonly array $certifications,
        private readonly array $zoneCodes,
        private readonly array $capacityData,
    ) {}

    public function handle(): Supplier
    {
        return DB::transaction(function () {
            $capSync = [];
            foreach ($this->capabilities as $cap) {
                $capSync[$cap['id']] = [
                    'proficiency_level' => $cap['proficiency_level'] ?? 'standard',
                    'years_experience' => $cap['years_experience'] ?? null,
                ];
            }
            $this->supplier->capabilities()->sync($capSync);

            $certSync = [];
            foreach ($this->certifications as $cert) {
                $certSync[$cert['id']] = [
                    'certificate_number' => $cert['certificate_number'] ?? null,
                    'issued_at' => $cert['issued_at'] ?? null,
                    'expires_at' => $cert['expires_at'] ?? null,
                    'is_verified' => false,
                ];
            }
            $this->supplier->certifications()->sync($certSync);

            $this->supplier->zones()->delete();
            foreach ($this->zoneCodes as $code) {
                $this->supplier->zones()->create([
                    'zone_code' => $code,
                    'zone_name' => SaudiZones::getName($code),
                    'covers_entire_zone' => true,
                ]);
            }

            $capacityUpdate = [];
            foreach (['max_contract_value', 'workforce_size', 'equipment_list', 'capacity_notes'] as $field) {
                if (array_key_exists($field, $this->capacityData) && $this->capacityData[$field] !== null) {
                    $capacityUpdate[$field] = $this->capacityData[$field];
                }
            }
            if ($capacityUpdate !== []) {
                $capacityUpdate['capacity_updated_at'] = now();
                $this->supplier->update($capacityUpdate);
            }

            return $this->supplier->fresh();
        });
    }
}
