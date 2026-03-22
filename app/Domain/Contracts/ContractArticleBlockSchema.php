<?php

declare(strict_types=1);

namespace App\Domain\Contracts;

/**
 * Contract article block JSON shape (library + draft).
 *
 * Library versions (ContractArticleVersion): blocks MUST NOT include selected_option.
 * Draft articles (ContractDraftArticle): option blocks MAY include selected_option (contract-specific).
 *
 * Optional keys on any block: "version" (int|string), "meta" (array<string, mixed>).
 *
 * @phpstan-type BlockOption array{
 *     key: string,
 *     title_en?: string|null,
 *     title_ar?: string|null,
 *     body_en: string,
 *     body_ar: string
 * }
 * @phpstan-type ArticleBlock array{
 *     id: string,
 *     type: string,
 *     sort_order: int,
 *     title_en?: string|null,
 *     title_ar?: string|null,
 *     body_en: string,
 *     body_ar: string,
 *     variable_keys?: array<int, string>|null,
 *     risk_tags?: array<int, string>|null,
 *     is_internal?: bool,
 *     options?: array<int, BlockOption>|null,
 *     selected_option?: string|null,
 *     version?: int|string|null,
 *     meta?: array<string, mixed>|null
 * }
 */
final class ContractArticleBlockSchema
{
    /** @var array<int, string> */
    public const BLOCK_TYPES = [
        'header',
        'recital',
        'definition',
        'clause',
        'condition',
        'option',
        'note',
    ];
}
