<?php

declare(strict_types=1);

namespace App\Services\Contracts;

use App\Domain\Contracts\ContractArticleBlockSchema;
use App\Models\ContractArticleVersion;
use App\Models\ContractDraftArticle;
use InvalidArgumentException;
use Ramsey\Uuid\Uuid;

/**
 * Normalizes, validates, and generates monolithic content from structured blocks.
 */
final class ContractArticleBlockComposer
{
    /**
     * @param  array<int, array<string, mixed>>  $blocks
     * @return array{content_en: string, content_ar: string}
     */
    public function generateMonolithicBodies(array $blocks, bool $libraryContext): array
    {
        $this->validateBlocks($blocks, $libraryContext);

        $normalized = $this->normalizeForPersistence($blocks, $libraryContext);

        $en = [];
        $ar = [];
        foreach ($this->sortedBlocks($normalized) as $block) {
            if ($this->isInternalBlock($block)) {
                continue;
            }
            $pair = $this->resolveBodiesForBlock($block, $libraryContext);
            if ($pair['en'] !== '') {
                $en[] = $pair['en'];
            }
            if ($pair['ar'] !== '') {
                $ar[] = $pair['ar'];
            }
        }

        return [
            'content_en' => implode("\n\n", $en),
            'content_ar' => implode("\n\n", $ar),
        ];
    }

    /**
     * Strips draft-only keys from blocks before persisting on ContractArticleVersion.
     *
     * @param  array<int, array<string, mixed>>  $blocks
     * @return array<int, array<string, mixed>>
     */
    public function stripDraftOnlyKeys(array $blocks): array
    {
        $out = [];
        foreach ($blocks as $block) {
            if (! is_array($block)) {
                continue;
            }
            unset($block['selected_option']);
            $out[] = $block;
        }

        return $out;
    }

    /**
     * @param  array<int, array<string, mixed>>  $blocks
     */
    public function validateBlocks(array $blocks, bool $libraryContext): void
    {
        if ($blocks === []) {
            throw new InvalidArgumentException('blocks must not be empty when provided.');
        }

        foreach ($blocks as $index => $block) {
            if (! is_array($block)) {
                throw new InvalidArgumentException("blocks.$index must be an array.");
            }

            if (! isset($block['id']) || ! is_string($block['id']) || $block['id'] === '') {
                throw new InvalidArgumentException("blocks.$index.id is required.");
            }
            if (! isset($block['type']) || ! is_string($block['type'])) {
                throw new InvalidArgumentException("blocks.$index.type is required.");
            }
            if (! in_array($block['type'], ContractArticleBlockSchema::BLOCK_TYPES, true)) {
                throw new InvalidArgumentException("blocks.$index.type is invalid.");
            }
            if (! isset($block['sort_order']) || ! is_numeric($block['sort_order'])) {
                throw new InvalidArgumentException("blocks.$index.sort_order is required.");
            }

            foreach (['body_en', 'body_ar'] as $f) {
                if (! array_key_exists($f, $block) || ! is_string($block[$f])) {
                    throw new InvalidArgumentException("blocks.$index.$f is required.");
                }
            }

            if ($libraryContext && isset($block['selected_option'])) {
                throw new InvalidArgumentException('selected_option is not allowed on library article blocks.');
            }

            if ($block['type'] === 'option') {
                $options = $block['options'] ?? null;
                if (! is_array($options) || count($options) < 2) {
                    throw new InvalidArgumentException("blocks.$index.options must have at least 2 entries for type option.");
                }
                foreach ($options as $oi => $opt) {
                    if (! is_array($opt)) {
                        throw new InvalidArgumentException("blocks.$index.options.$oi must be an array.");
                    }
                    if (! isset($opt['key']) || ! is_string($opt['key']) || $opt['key'] === '') {
                        throw new InvalidArgumentException("blocks.$index.options.$oi.key is required.");
                    }
                    foreach (['body_en', 'body_ar'] as $bf) {
                        if (! array_key_exists($bf, $opt) || ! is_string($opt[$bf])) {
                            throw new InvalidArgumentException("blocks.$index.options.$oi.$bf is required.");
                        }
                    }
                }
            } elseif (isset($block['options']) && $block['options'] !== null) {
                throw new InvalidArgumentException('options is only valid for type option.');
            }
        }
    }

    /**
     * @param  array<int, array<string, mixed>>  $blocks
     * @return array<int, array<string, mixed>>
     */
    private function normalizeForPersistence(array $blocks, bool $libraryContext): array
    {
        $out = [];
        foreach ($blocks as $block) {
            if (! is_array($block)) {
                continue;
            }
            if ($libraryContext) {
                unset($block['selected_option']);
            }
            $out[] = $block;
        }

        return $out;
    }

    /**
     * @param  array<string, mixed>  $block
     */
    private function isInternalBlock(array $block): bool
    {
        return isset($block['is_internal']) && $block['is_internal'] === true;
    }

    /**
     * @param  array<int, array<string, mixed>>  $blocks
     * @return array<int, array<string, mixed>>
     */
    private function sortedBlocks(array $blocks): array
    {
        usort($blocks, static function (array $a, array $b): int {
            return ((int) ($a['sort_order'] ?? 0)) <=> ((int) ($b['sort_order'] ?? 0));
        });

        return $blocks;
    }

    /**
     * Single-language plain body for one block (before placeholder rendering).
     *
     * @param  array<string, mixed>  $block
     */
    public function plainBodyForBlockAndLang(array $block, string $lang, bool $libraryContext): string
    {
        if ($this->isInternalBlock($block)) {
            return '';
        }
        $pair = $this->resolveBodiesForBlock($block, $libraryContext);

        return $lang === 'ar' ? $pair['ar'] : $pair['en'];
    }

    /**
     * @param  array<int, array<string, mixed>>  $blocks
     * @return array<int, array<string, mixed>>
     */
    public function sortBlocks(array $blocks): array
    {
        return $this->sortedBlocks($blocks);
    }

    /**
     * @param  array<string, mixed>  $block
     * @return array{en: string, ar: string}
     */
    private function resolveBodiesForBlock(array $block, bool $libraryContext): array
    {
        if (($block['type'] ?? '') !== 'option') {
            return [
                'en' => (string) ($block['body_en'] ?? ''),
                'ar' => (string) ($block['body_ar'] ?? ''),
            ];
        }

        $options = $block['options'] ?? [];
        if (! is_array($options) || $options === []) {
            return ['en' => '', 'ar' => ''];
        }

        $selectedKey = $libraryContext ? null : (isset($block['selected_option']) ? (string) $block['selected_option'] : null);
        $chosen = null;
        if ($selectedKey !== null && $selectedKey !== '') {
            foreach ($options as $opt) {
                if (is_array($opt) && isset($opt['key']) && (string) $opt['key'] === $selectedKey) {
                    $chosen = $opt;
                    break;
                }
            }
        }
        if ($chosen === null) {
            $first = $options[0] ?? null;
            $chosen = is_array($first) ? $first : null;
        }
        if ($chosen === null) {
            return ['en' => '', 'ar' => ''];
        }

        return [
            'en' => (string) ($chosen['body_en'] ?? ''),
            'ar' => (string) ($chosen['body_ar'] ?? ''),
        ];
    }

    /**
     * Stable UUID for a synthetic single block when DB blocks is null (read fallback).
     */
    public static function deterministicBlockIdForVersion(string $contractArticleVersionId): string
    {
        return Uuid::uuid5(Uuid::NAMESPACE_URL, 'contract_article_version:block:'.$contractArticleVersionId)
            ->toString();
    }

    /**
     * Draft-only: set selected_option to the first option key for each option block (contract-specific selection).
     *
     * @param  array<int, array<string, mixed>>  $blocks
     * @return array<int, array<string, mixed>>
     */
    public function applyDefaultSelectedOptionsForDraft(array $blocks): array
    {
        $out = [];
        foreach ($blocks as $block) {
            if (! is_array($block)) {
                continue;
            }
            if (($block['type'] ?? '') === 'option' && isset($block['options']) && is_array($block['options']) && $block['options'] !== []) {
                $first = $block['options'][0];
                if (is_array($first) && isset($first['key']) && is_string($first['key']) && $first['key'] !== '') {
                    $block['selected_option'] = $first['key'];
                }
            }
            $out[] = $block;
        }

        return $out;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public static function defaultBlocksFromDraftArticle(ContractDraftArticle $draft): array
    {
        return [[
            'id' => Uuid::uuid5(Uuid::NAMESPACE_URL, 'contract_draft_article:block:'.$draft->id)->toString(),
            'type' => 'clause',
            'sort_order' => 1,
            'title_en' => $draft->title_en,
            'title_ar' => $draft->title_ar,
            'body_en' => $draft->content_en,
            'body_ar' => $draft->content_ar,
            'variable_keys' => [],
            'risk_tags' => [],
            'is_internal' => false,
            'options' => null,
        ]];
    }

    /**
     * Default single block from version monolithic fields (in-memory fallback; not persisted).
     *
     * @return array<int, array<string, mixed>>
     */
    public static function defaultBlocksFromVersionContent(ContractArticleVersion $version): array
    {
        $risk = $version->risk_tags;
        if (! is_array($risk)) {
            $risk = [];
        }

        return [[
            'id' => self::deterministicBlockIdForVersion((string) $version->id),
            'type' => 'clause',
            'sort_order' => 1,
            'title_en' => $version->title_en,
            'title_ar' => $version->title_ar,
            'body_en' => $version->content_en,
            'body_ar' => $version->content_ar,
            'variable_keys' => [],
            'risk_tags' => $risk,
            'is_internal' => false,
            'options' => null,
        ]];
    }

    /**
     * Plain concatenation for one language (library/article version context: no draft selected_option).
     *
     * @param  array<int, array<string, mixed>>  $blocks
     */
    public function concatenateBodiesForLang(array $blocks, string $lang, bool $libraryContext): string
    {
        $parts = [];
        foreach ($this->sortedBlocks($blocks) as $block) {
            if ($this->isInternalBlock($block)) {
                continue;
            }
            $pair = $this->resolveBodiesForBlock($block, $libraryContext);
            $chunk = $lang === 'ar' ? $pair['ar'] : $pair['en'];
            if ($chunk !== '') {
                $parts[] = $chunk;
            }
        }

        return implode("\n\n", $parts);
    }
}
