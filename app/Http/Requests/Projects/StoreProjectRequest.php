<?php

declare(strict_types=1);

namespace App\Http\Requests\Projects;

use Illuminate\Foundation\Http\FormRequest;

class StoreProjectRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'status' => ['nullable', 'string', 'in:active,archived,on_hold'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'code' => ['nullable', 'string', 'max:50'],
            'name_ar' => ['nullable', 'string', 'max:200'],
            'client' => ['nullable', 'string', 'max:200'],
            'currency' => ['nullable', 'string', 'size:3'],
            'contract_value' => ['nullable', 'numeric', 'min:0'],
            'planned_margin_pct' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'min_margin_pct' => [
                'nullable',
                'numeric',
                'min:0',
                'max:100',
                function (string $attribute, mixed $value, \Closure $fail): void {
                    $planned = $this->input('planned_margin_pct');
                    if ($value !== null && $planned !== null && (float) $value > (float) $planned) {
                        $fail('Minimum margin cannot exceed planned margin.');
                    }
                },
            ],
        ];
    }
}
