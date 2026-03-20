<?php

declare(strict_types=1);

namespace App\Http\Requests\Contracts;

use App\Models\ContractTemplate;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreContractTemplateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', ContractTemplate::class) ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'code' => ['required', 'string', 'max:100', 'unique:contract_templates,code'],
            'name_en' => ['required', 'string', 'max:255'],
            'name_ar' => ['required', 'string', 'max:255'],
            'template_type' => ['required', 'string', Rule::in(ContractTemplate::TEMPLATE_TYPES)],
            'status' => ['required', 'string', Rule::in(ContractTemplate::STATUSES)],
            'description' => ['nullable', 'string'],
            'internal_notes' => ['nullable', 'string'],
            'article_ids' => ['required', 'array', 'min:1'],
            'article_ids.*' => ['required', 'uuid', 'exists:contract_articles,id'],
        ];
    }
}

