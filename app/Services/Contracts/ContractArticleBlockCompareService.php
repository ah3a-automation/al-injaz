<?php

declare(strict_types=1);

namespace App\Services\Contracts;

use App\Models\ContractArticleVersion;

/**
 * Block-aware alignment for comparing two article block snapshots (library versions or drafts).
 */
final class ContractArticleBlockCompareService
{
    public function __construct(
        private readonly ContractArticleBlockComposer $blockComposer,
    ) {
    }

    /**
     * Compare two block lists aligned by stable block id.
     *
     * @param  array<int, array<string, mixed>>  $leftBlocks
     * @param  array<int, array<string, mixed>>  $rightBlocks
     * @param  bool  $libraryContext  When true, ignore selected_option in fingerprints (library / stripped snapshots).
     *
     * @return array{
     *     rows: array<int, array<string, mixed>>,
     *     summary: array{
     *         unchanged: int,
     *         changed: int,
     *         added: int,
     *         removed: int,
     *         reordered: int
     *     }
     * }
     */
    public function compare(array $leftBlocks, array $rightBlocks, bool $libraryContext): array
    {
        $leftSorted = $this->blockComposer->sortBlocks($leftBlocks);
        $rightSorted = $this->blockComposer->sortBlocks($rightBlocks);

        $leftById = $this->indexById($leftSorted);
        $rightById = $this->indexById($rightSorted);

        $idsLeft = array_keys($leftById);
        $idsRight = array_keys($rightById);

        $onlyLeft = array_values(array_diff($idsLeft, $idsRight));
        $onlyRight = array_values(array_diff($idsRight, $idsLeft));
        $common = array_values(array_intersect($idsLeft, $idsRight));

        $rows = [];

        foreach ($onlyLeft as $id) {
            $block = $leftById[$id];
            $rows[] = [
                'kind' => 'left_only',
                'status' => 'removed',
                'block_id' => $id,
                'left' => $this->enrichBlockForCompare($block, $libraryContext),
                'right' => null,
            ];
        }

        foreach ($onlyRight as $id) {
            $block = $rightById[$id];
            $rows[] = [
                'kind' => 'right_only',
                'status' => 'added',
                'block_id' => $id,
                'left' => null,
                'right' => $this->enrichBlockForCompare($block, $libraryContext),
            ];
        }

        foreach ($common as $id) {
            $lb = $leftById[$id];
            $rb = $rightById[$id];
            $fpL = $this->contentFingerprint($lb, $libraryContext);
            $fpR = $this->contentFingerprint($rb, $libraryContext);
            $soL = (int) ($lb['sort_order'] ?? 0);
            $soR = (int) ($rb['sort_order'] ?? 0);

            if ($fpL !== $fpR) {
                $status = 'changed';
            } elseif ($soL !== $soR) {
                $status = 'reordered';
            } else {
                $status = 'unchanged';
            }

            $rows[] = [
                'kind' => 'paired',
                'status' => $status,
                'block_id' => $id,
                'left' => $this->enrichBlockForCompare($lb, $libraryContext),
                'right' => $this->enrichBlockForCompare($rb, $libraryContext),
            ];
        }

        usort($rows, static function (array $a, array $b): int {
            $orderKey = static function (array $row): int {
                $l = $row['left'] ?? null;
                $r = $row['right'] ?? null;
                if (is_array($l)) {
                    return (int) ($l['sort_order'] ?? 0);
                }
                if (is_array($r)) {
                    return (int) ($r['sort_order'] ?? 0);
                }

                return 999999;
            };
            $oa = $orderKey($a);
            $ob = $orderKey($b);
            if ($oa !== $ob) {
                return $oa <=> $ob;
            }

            return strcmp((string) ($a['block_id'] ?? ''), (string) ($b['block_id'] ?? ''));
        });

        $summary = [
            'unchanged' => 0,
            'changed' => 0,
            'added' => 0,
            'removed' => 0,
            'reordered' => 0,
        ];
        foreach ($rows as $row) {
            $st = $row['status'] ?? '';
            if (isset($summary[$st])) {
                $summary[$st]++;
            }
        }

        return [
            'rows' => $rows,
            'summary' => $summary,
        ];
    }

    /**
     * @param  array<int, array<string, mixed>>  $blocks
     * @return array<string, array<string, mixed>>
     */
    private function indexById(array $blocks): array
    {
        $out = [];
        foreach ($blocks as $block) {
            if (! is_array($block)) {
                continue;
            }
            $id = (string) ($block['id'] ?? '');
            if ($id === '') {
                continue;
            }
            $out[$id] = $block;
        }

        return $out;
    }

    /**
     * @return array<string, mixed>
     */
    private function enrichBlockForCompare(array $block, bool $libraryContext): array
    {
        $out = $block;
        $out['compare_effective_option_key'] = null;
        $out['compare_option_keys_ordered'] = [];

        if (($block['type'] ?? '') !== 'option') {
            return $out;
        }

        $options = $block['options'] ?? [];
        if (! is_array($options) || $options === []) {
            return $out;
        }

        $sorted = $options;
        usort($sorted, static function ($a, $b): int {
            $ka = is_array($a) && isset($a['key']) ? (string) $a['key'] : '';
            $kb = is_array($b) && isset($b['key']) ? (string) $b['key'] : '';

            return strcmp($ka, $kb);
        });

        foreach ($sorted as $opt) {
            if (is_array($opt) && isset($opt['key'])) {
                $out['compare_option_keys_ordered'][] = (string) $opt['key'];
            }
        }

        if ($libraryContext) {
            $first = $sorted[0] ?? null;
            $out['compare_effective_option_key'] = is_array($first) && isset($first['key'])
                ? (string) $first['key']
                : null;
        } else {
            $sel = isset($block['selected_option']) ? (string) $block['selected_option'] : '';
            if ($sel !== '') {
                $out['compare_effective_option_key'] = $sel;
            } else {
                $first = $sorted[0] ?? null;
                $out['compare_effective_option_key'] = is_array($first) && isset($first['key'])
                    ? (string) $first['key']
                    : null;
            }
        }

        return $out;
    }

    /**
     * Content-only fingerprint (excludes sort_order; normalizes option order).
     */
    private function contentFingerprint(array $block, bool $libraryContext): string
    {
        $b = $block;
        unset($b['sort_order'], $b['version'], $b['meta']);
        if ($libraryContext) {
            unset($b['selected_option']);
        }

        unset($b['compare_effective_option_key'], $b['compare_option_keys_ordered']);

        if (isset($b['options']) && is_array($b['options'])) {
            $opts = $b['options'];
            usort($opts, static function ($x, $y): int {
                $kx = is_array($x) && isset($x['key']) ? (string) $x['key'] : '';
                $ky = is_array($y) && isset($y['key']) ? (string) $y['key'] : '';

                return strcmp($kx, $ky);
            });
            $b['options'] = $opts;
        }

        if (isset($b['risk_tags']) && is_array($b['risk_tags'])) {
            $tags = array_map(static fn ($t) => (string) $t, $b['risk_tags']);
            sort($tags);
            $b['risk_tags'] = $tags;
        }

        if (isset($b['variable_keys']) && is_array($b['variable_keys'])) {
            $vk = array_map(static fn ($k) => (string) $k, $b['variable_keys']);
            sort($vk);
            $b['variable_keys'] = $vk;
        }

        ksort($b);

        $json = json_encode($b, JSON_UNESCAPED_UNICODE);
        if ($json === false) {
            $json = json_encode($b, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE) ?: '';
        }

        return hash('sha256', (string) $json);
    }
}
