<?php

declare(strict_types=1);

namespace App\Http\Requests\Contracts;

use App\Models\Rfq;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreContractFromRfqRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var Rfq|null $rfq */
        $rfq = $this->route('rfq');

        return $rfq !== null
            ? ($this->user()?->can('createContract', $rfq) ?? false)
            : false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'contract_template_id' => ['nullable', 'uuid', 'exists:contract_templates,id'],
            'article_ids' => ['nullable', 'array'],
            'article_ids.*' => ['uuid', 'exists:contract_articles,id'],
            'title_en' => ['nullable', 'string', 'max:255'],
            'title_ar' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'internal_notes' => ['nullable', 'string'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
        ];
    }
}

