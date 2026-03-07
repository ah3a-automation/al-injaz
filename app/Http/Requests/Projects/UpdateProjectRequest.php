<?php

declare(strict_types=1);

namespace App\Http\Requests\Projects;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProjectRequest extends FormRequest
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
            'name' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'status' => ['nullable', 'string', 'in:active,archived,on_hold'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
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
