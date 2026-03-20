<?php

declare(strict_types=1);

namespace App\Http\Requests\Contracts;

use Illuminate\Foundation\Http\FormRequest;

class RestoreContractArticleVersionRequest extends FormRequest
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
        return [
            'change_summary' => ['nullable', 'string', 'max:1000'],
        ];
    }
}

