<?php

declare(strict_types=1);

namespace App\Http\Requests\Contracts;

use App\Models\ContractTemplate;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateContractTemplateRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var ContractTemplate|null $template */
        $template = $this->route('contract_template');

        return $template !== null
            ? ($this->user()?->can('update', $template) ?? false)
            : false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        /** @var ContractTemplate|null $template */
        $template = $this->route('contract_template');

        return [
            'name_en' => ['required', 'string', 'max:255'],
            'name_ar' => ['required', 'string', 'max:255'],
            'template_type' => ['required', 'string', Rule::in(ContractTemplate::TEMPLATE_TYPES)],
            'status' => ['required', 'string', Rule::in(ContractTemplate::STATUSES)],
            'description' => ['nullable', 'string'],
            'internal_notes' => ['nullable', 'string'],
            'article_ids' => ['sometimes', 'array'],
            'article_ids.*' => ['uuid', 'exists:contract_articles,id'],
            'code' => [
                'required',
                'string',
                'max:100',
                Rule::unique('contract_templates', 'code')->ignore($template?->id),
            ],
        ];
    }
}

