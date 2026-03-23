<?php

declare(strict_types=1);

namespace App\Services\Contracts;

use App\Models\Contract;

/**
 * Renders content by parsing placeholders, resolving values, applying formatters.
 * Returns rendered string and lists of used/unresolved variable keys.
 */
final class ContractArticleRenderer
{
    public function __construct(
        private readonly ContractArticleBlockComposer $blockComposer,
        private readonly ContractPlaceholderParser $parser = new ContractPlaceholderParser(),
        private readonly ContractVariableResolver $resolver = new ContractVariableResolver(),
        private readonly ContractVariableFormatter $formatter = new ContractVariableFormatter(),
    ) {
    }

    /**
     * @return array{rendered_content: string, used_variable_keys: array<string>, unresolved_variable_keys: array<string>}
     */
    public function render(string $content, Contract $contract, ?string $currency = null): array
    {
        $used = [];
        $unresolved = [];
        $rendered = $content;
        $parsed = $this->parser->extract($content);

        foreach ($parsed as $item) {
            if (! $item['valid_syntax']) {
                continue;
            }
            $key = $item['key'];
            $used[$key] = true;
            $resolved = $this->resolver->resolveOne($contract, $key);
            if ($resolved !== null && $resolved !== '') {
                $formatterName = $item['formatter'];
                if ($formatterName !== null) {
                    $resolved = $this->formatter->format($resolved, $formatterName, $currency ?? $contract->currency);
                }
                $rendered = str_replace($item['raw'], $resolved, $rendered);
            } else {
                $unresolved[$key] = true;
            }
        }

        return [
            'rendered_content' => $rendered,
            'used_variable_keys' => array_keys($used),
            'unresolved_variable_keys' => array_keys($unresolved),
        ];
    }

    /**
     * @param  array<int, array<string, mixed>>  $blocks
     * @return array{rendered_content: string, used_variable_keys: array<string>, unresolved_variable_keys: array<string>}
     */
    public function renderBlocks(
        array $blocks,
        string $lang,
        Contract $contract,
        bool $libraryContext,
        ?string $currency = null
    ): array {
        $used = [];
        $unresolved = [];
        $chunks = [];

        foreach ($this->blockComposer->sortBlocks($blocks) as $block) {
            if (! is_array($block)) {
                continue;
            }
            if (isset($block['is_internal']) && $block['is_internal'] === true) {
                continue;
            }
            $plain = $this->blockComposer->plainBodyForBlockAndLang($block, $lang, $libraryContext);
            if ($plain === '') {
                continue;
            }
            $segment = $this->render($plain, $contract, $currency);
            $chunks[] = $segment['rendered_content'];
            foreach ($segment['used_variable_keys'] as $k) {
                $used[$k] = true;
            }
            foreach ($segment['unresolved_variable_keys'] as $k) {
                $unresolved[$k] = true;
            }
        }

        return [
            'rendered_content' => implode("\n\n", array_filter($chunks, static fn (string $c): bool => $c !== '')),
            'used_variable_keys' => array_keys($used),
            'unresolved_variable_keys' => array_keys($unresolved),
        ];
    }
}
