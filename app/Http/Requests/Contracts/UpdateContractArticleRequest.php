<?php

declare(strict_types=1);

namespace App\Http\Requests\Contracts;

use App\Models\ContractArticleVersion;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateContractArticleRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var \App\Models\ContractArticle|null $article */
        $article = $this->route('contract_article');

        return $article !== null
            ? ($this->user()?->can('update', $article) ?? false)
            : false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        /** @var \App\Models\ContractArticle|null $article */
        $article = $this->route('contract_article');

        return [
            'code' => [
                'required',
                'string',
                'max:100',
                Rule::unique('contract_articles', 'code')->ignore($article?->id),
            ],
            'serial' => ['required', 'integer'],
            'category' => ['required', 'string', Rule::in(['mandatory', 'recommended', 'optional'])],
            'status' => ['required', 'string', Rule::in(['draft', 'active', 'archived'])],
            'internal_notes' => ['nullable', 'string'],
            'title_ar' => ['sometimes', 'required', 'string'],
            'title_en' => ['sometimes', 'required', 'string'],
            'content_ar' => ['sometimes', 'required', 'string'],
            'content_en' => ['sometimes', 'required', 'string'],
            'change_summary' => ['nullable', 'string', 'max:1000'],
            'risk_tags' => ['nullable', 'array'],
            'risk_tags.*' => ['string', Rule::in(ContractArticleVersion::RISK_TAGS)],
        ];
    }
}

