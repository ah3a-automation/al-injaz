<?php

declare(strict_types=1);

namespace App\Services\Contracts;

use App\Models\Contract;
use Carbon\Carbon;

/**
 * Resolves registry variables for a contract: system, entity (supplier/contract/project/rfq/quote), and manual overrides.
 */
final class ContractVariableResolver
{
    public function __construct(
        private readonly ContractVariableFormatter $formatter = new ContractVariableFormatter(),
    ) {
    }

    /**
     * @return array<string, string|null> Map of variable key => resolved value (null if unresolved)
     */
    public function resolve(Contract $contract): array
    {
        $values = [];

        $contract->load([
            'supplier',
            'project',
            'rfq.award.rfqQuote',
            'rfq.award.quote',
            'variableOverrides',
        ]);

        foreach (ContractVariableRegistry::getVariables() as $key => $def) {
            $value = $this->resolveOne($contract, $key);
            $values[$key] = $value;
        }

        return $values;
    }

    /** Legacy underscore keys → canonical dot-notation (Phase 20 locked format). */
    private const KEY_ALIASES = [
        'project_name_ar' => 'project.name_ar',
        'project_name_en' => 'project.name_en',
        'project_code' => 'project.code',
    ];

    /**
     * Resolve a single key. Returns null if not found or not applicable.
     * Legacy underscore-style keys (e.g. project_name_ar) are mapped to canonical registry keys (e.g. project.name_ar).
     */
    public function resolveOne(Contract $contract, string $key): ?string
    {
        if (! ContractVariableRegistry::has($key)) {
            $canonical = self::KEY_ALIASES[$key] ?? null;
            if ($canonical !== null) {
                return $this->resolveOne($contract, $canonical);
            }

            return null;
        }

        $parts = explode('.', $key, 2);
        $source = $parts[0] ?? '';
        $subKey = $parts[1] ?? '';

        if ($source === 'today') {
            return $this->resolveToday($subKey);
        }

        if ($source === 'manual') {
            return $this->resolveManual($contract, $key);
        }

        if ($source === 'supplier') {
            return $this->resolveSupplier($contract, $subKey);
        }
        if ($source === 'contract') {
            return $this->resolveContract($contract, $subKey);
        }
        if ($source === 'project') {
            return $this->resolveProject($contract, $subKey);
        }
        if ($source === 'rfq') {
            return $this->resolveRfq($contract, $subKey);
        }
        if ($source === 'quote') {
            return $this->resolveQuote($contract, $subKey);
        }

        return null;
    }

    private function resolveToday(string $subKey): ?string
    {
        $now = Carbon::now();
        if ($subKey === '' || $subKey === 'date') {
            return $now->format('Y-m-d');
        }
        if ($subKey === 'hijri') {
            return $this->formatter->hijriDate($now);
        }

        return null;
    }

    private function resolveManual(Contract $contract, string $key): ?string
    {
        $override = $contract->variableOverrides->firstWhere('variable_key', $key);

        return $override?->value_text;
    }

    private function resolveSupplier(Contract $contract, string $subKey): ?string
    {
        $supplier = $contract->supplier;
        if ($supplier === null) {
            return null;
        }

        return match ($subKey) {
            'legal_name_ar' => $supplier->legal_name_ar,
            'legal_name_en' => $supplier->legal_name_en,
            'commercial_registration_no' => $supplier->commercial_registration_no ?? null,
            'vat_number' => $supplier->vat_number ?? null,
            default => null,
        };
    }

    private function resolveContract(Contract $contract, string $subKey): ?string
    {
        return match ($subKey) {
            'number' => $contract->contract_number,
            'value' => $contract->contract_value !== null ? (string) $contract->contract_value : null,
            'start_date' => $contract->start_date?->format('Y-m-d'),
            'end_date' => $contract->end_date?->format('Y-m-d'),
            'duration_days' => $this->contractDurationDays($contract),
            'title_ar' => $contract->title_ar,
            'title_en' => $contract->title_en,
            default => null,
        };
    }

    private function contractDurationDays(Contract $contract): ?string
    {
        if ($contract->start_date === null || $contract->end_date === null) {
            return null;
        }

        return (string) $contract->start_date->diffInDays($contract->end_date, false);
    }

    private function resolveProject(Contract $contract, string $subKey): ?string
    {
        $project = $contract->project ?? $contract->rfq?->project;
        if ($project === null) {
            return null;
        }

        return match ($subKey) {
            'name_ar' => $project->name_ar ?? $project->name,
            'name_en' => $project->name_en ?? $project->name,
            'code' => $project->code ?? null,
            default => null,
        };
    }

    private function resolveRfq(Contract $contract, string $subKey): ?string
    {
        $rfq = $contract->rfq;
        if ($rfq === null) {
            return null;
        }

        return match ($subKey) {
            'number' => $rfq->rfq_number ?? null,
            'title' => $rfq->title ?? null,
            default => null,
        };
    }

    private function resolveQuote(Contract $contract, string $subKey): ?string
    {
        $award = $contract->rfq?->award;
        if ($award === null) {
            return null;
        }

        $rfqQuote = $award->rfqQuote;
        $supplierQuote = $award->quote;

        return match ($subKey) {
            'total_value' => $award->awarded_amount !== null ? (string) $award->awarded_amount : null,
            'submitted_at' => $rfqQuote?->submitted_at?->format('Y-m-d H:i:s')
                ?? $supplierQuote?->submitted_at?->format('Y-m-d H:i:s'),
            default => null,
        };
    }
}
