<?php

declare(strict_types=1);

namespace App\Services\Contracts;

/**
 * Extracts and parses {{ variable.key | formatter }} placeholders from content.
 * No nested placeholders, functions, conditionals, or formulas.
 */
final class ContractPlaceholderParser
{
    /** Pattern: {{ optional-spaces key optional-spaces | optional-formatter optional-spaces }} */
    private const PATTERN = '/\{\{\s*([^}|]+?)(?:\s*\|\s*([a-z_]+))?\s*\}\}/u';

    /**
     * @return array<int, array{raw: string, key: string, formatter: string|null, valid_syntax: bool}>
     */
    public function extract(string $content): array
    {
        $results = [];
        if (preg_match_all(self::PATTERN, $content, $matches, PREG_SET_ORDER) === false) {
            return $results;
        }
        foreach ($matches as $match) {
            $raw = $match[0];
            $key = trim($match[1] ?? '');
            $formatter = isset($match[2]) ? trim($match[2]) : null;
            if ($formatter === '') {
                $formatter = null;
            }
            $validSyntax = $this->validateKeySyntax($key)
                && ($formatter === null || in_array($formatter, ContractVariableRegistry::FORMATTERS, true));
            $results[] = [
                'raw' => $raw,
                'key' => $key,
                'formatter' => $formatter,
                'valid_syntax' => $validSyntax,
            ];
        }

        return $results;
    }

    /**
     * @return array<string> Unique variable keys (with formatter not part of key; key only)
     */
    public function extractUniqueKeys(string $content): array
    {
        $parsed = $this->extract($content);
        $keys = [];
        foreach ($parsed as $p) {
            if ($p['valid_syntax'] && $p['key'] !== '') {
                $keys[$p['key']] = true;
            }
        }

        return array_keys($keys);
    }

    private function validateKeySyntax(string $key): bool
    {
        if ($key === '') {
            return false;
        }
        $parts = explode('.', $key);
        foreach ($parts as $part) {
            $trimmed = trim($part);
            if ($trimmed === '' || preg_match('/[^a-z0-9_]/u', $trimmed) !== 0) {
                return false;
            }
        }

        return true;
    }
}
