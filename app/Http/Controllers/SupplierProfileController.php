<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Application\Suppliers\Commands\UpdateSupplierCapabilitiesCommand;
use App\Models\Supplier;
use App\Services\ActivityLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

final class SupplierProfileController extends Controller
{
    public function __construct(
        private readonly ActivityLogger $activityLogger,
    ) {}

    public function updateCapabilities(Request $request, Supplier $supplier): RedirectResponse
    {
        if (! $request->user()->can('suppliers.edit')) {
            abort(403);
        }

        $capacity = $request->input('capacity', []);
        foreach ($capacity as $k => $v) {
            if ($v === '') {
                $capacity[$k] = null;
            }
        }
        $request->merge(['capacity' => $capacity]);

        $validated = $request->validate([
            'capabilities' => ['nullable', 'array'],
            'capabilities.*.id' => ['required', 'integer', 'exists:supplier_capabilities,id'],
            'capabilities.*.proficiency_level' => ['nullable', 'string', 'in:basic,standard,advanced,expert'],
            'capabilities.*.years_experience' => ['nullable', 'integer', 'min:0', 'max:100'],
            'certifications' => ['nullable', 'array'],
            'certifications.*.id' => ['required', 'integer', 'exists:certifications,id'],
            'certifications.*.certificate_number' => ['nullable', 'string', 'max:100'],
            'certifications.*.issued_at' => ['nullable', 'date'],
            'certifications.*.expires_at' => ['nullable', 'date'],
            'zone_codes' => ['nullable', 'array'],
            'zone_codes.*' => ['nullable', 'string', 'in:RYD,JED,DAM,MED,ABH,TAI,BUR,HAI,JAZ,NAJ,JOF,NOR,BAH'],
            'capacity' => ['nullable', 'array'],
            'capacity.max_contract_value' => ['nullable', 'numeric', 'min:0'],
            'capacity.workforce_size' => ['nullable', 'integer', 'min:0'],
            'capacity.equipment_list' => ['nullable', 'string', 'max:5000'],
            'capacity.capacity_notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $capacityData = $validated['capacity'] ?? [];
        $capData = [];
        if (array_key_exists('max_contract_value', $capacityData)) {
            $v = $capacityData['max_contract_value'];
            $capData['max_contract_value'] = ($v === '' || $v === null) ? null : (float) $v;
        }
        if (array_key_exists('workforce_size', $capacityData)) {
            $v = $capacityData['workforce_size'];
            $capData['workforce_size'] = ($v === '' || $v === null) ? null : (int) $v;
        }
        if (array_key_exists('equipment_list', $capacityData)) {
            $capData['equipment_list'] = $capacityData['equipment_list'] === '' ? null : (string) $capacityData['equipment_list'];
        }
        if (array_key_exists('capacity_notes', $capacityData)) {
            $capData['capacity_notes'] = $capacityData['capacity_notes'] === '' ? null : (string) $capacityData['capacity_notes'];
        }

        (new UpdateSupplierCapabilitiesCommand(
            supplier: $supplier,
            capabilities: $validated['capabilities'] ?? [],
            certifications: $validated['certifications'] ?? [],
            zoneCodes: array_values(array_filter($validated['zone_codes'] ?? [])),
            capacityData: $capData,
        ))->handle();

        $this->activityLogger->log(
            'suppliers.supplier.capabilities_updated',
            $supplier,
            [],
            ['supplier_name' => $supplier->legal_name_en],
            auth()->user()
        );

        return redirect()->route('suppliers.show', $supplier)
            ->with('success', 'Supplier capabilities updated.');
    }
}
