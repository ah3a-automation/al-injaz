<?php

declare(strict_types=1);

namespace App\Http\Requests\Contracts;

use App\Models\ContractArticleVersion;
use App\Services\Contracts\ContractArticleBlockComposer;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use InvalidArgumentException;

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
            'content_ar' => ['sometimes', 'string', Rule::requiredIf(fn (): bool => ! $this->hasNonEmptyBlocks())],
            'content_en' => ['sometimes', 'string', Rule::requiredIf(fn (): bool => ! $this->hasNonEmptyBlocks())],
            'change_summary' => ['nullable', 'string', 'max:1000'],
            'risk_tags' => ['nullable', 'array'],
            'risk_tags.*' => ['string', Rule::in(ContractArticleVersion::RISK_TAGS)],
            'blocks' => ['nullable', 'array'],
            'blocks.*.id' => ['required_with:blocks', 'uuid'],
            'blocks.*.type' => ['required_with:blocks', 'string', Rule::in(ContractArticleVersion::BLOCK_TYPES)],
            'blocks.*.sort_order' => ['required_with:blocks', 'integer'],
            'blocks.*.title_en' => ['nullable', 'string'],
            'blocks.*.title_ar' => ['nullable', 'string'],
            'blocks.*.body_en' => ['required_with:blocks', 'string'],
            'blocks.*.body_ar' => ['required_with:blocks', 'string'],
            'blocks.*.is_internal' => ['nullable', 'boolean'],
            'blocks.*.variable_keys' => ['nullable', 'array'],
            'blocks.*.risk_tags' => ['nullable', 'array'],
            'blocks.*.risk_tags.*' => ['string', Rule::in(ContractArticleVersion::RISK_TAGS)],
            'blocks.*.options' => ['nullable', 'array'],
            'blocks.*.version' => ['nullable'],
            'blocks.*.meta' => ['nullable', 'array'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator): void {
            if (! $this->hasNonEmptyBlocks()) {
                return;
            }
            /** @var array<int, array<string, mixed>> $blocks */
            $blocks = $this->input('blocks', []);
            $composer = app(ContractArticleBlockComposer::class);
            try {
                $composer->validateBlocks($blocks, true);
            } catch (InvalidArgumentException $e) {
                $validator->errors()->add('blocks', $e->getMessage());
            }
        });
    }

    private function hasNonEmptyBlocks(): bool
    {
        return is_array($this->input('blocks')) && $this->input('blocks') !== [];
    }
}
