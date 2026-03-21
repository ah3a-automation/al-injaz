<?php

declare(strict_types=1);

namespace App\Http\Requests\Contracts;

use App\Models\ContractArticleVersion;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreContractArticleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', \App\Models\ContractArticle::class) ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'code' => ['required', 'string', 'max:100', 'unique:contract_articles,code'],
            'serial' => ['required', 'integer'],
            'category' => ['required', 'string', Rule::in(['mandatory', 'recommended', 'optional'])],
            'status' => ['required', 'string', Rule::in(['draft', 'active', 'archived'])],
            'internal_notes' => ['nullable', 'string'],
            'title_ar' => ['required', 'string'],
            'title_en' => ['required', 'string'],
            'content_ar' => ['required', 'string'],
            'content_en' => ['required', 'string'],
            'change_summary' => ['nullable', 'string', 'max:1000'],
            'risk_tags' => ['nullable', 'array'],
            'risk_tags.*' => ['string', Rule::in(ContractArticleVersion::RISK_TAGS)],
        ];
    }
}

