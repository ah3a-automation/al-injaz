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
}
