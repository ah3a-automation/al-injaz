<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\ContractArticleVersion;
use App\Services\Contracts\ContractArticleBlockComposer;
use Illuminate\Console\Command;
use Throwable;

final class ContractsBackfillArticleBlocksCommand extends Command
{
    protected $signature = 'contracts:backfill-article-blocks {--dry-run : Show counts without writing}';

    protected $description = 'Populate contract_article_versions.blocks with a single clause block from existing content (library rows only).';

    public function handle(): int
    {
        $dry = (bool) $this->option('dry-run');

        $query = ContractArticleVersion::query()->whereNull('blocks');
        $total = (clone $query)->count();

        if ($total === 0) {
            $this->info('No contract article versions need backfill.');

            return self::SUCCESS;
        }

        $this->info("Versions with null blocks: {$total}");
        if ($dry) {
            $this->warn('Dry run — no changes written.');

            return self::SUCCESS;
        }

        $updated = 0;
        $query->orderBy('id')->chunkById(100, function ($versions) use (&$updated): void {
            foreach ($versions as $version) {
                if (! $version instanceof ContractArticleVersion) {
                    continue;
                }
                try {
                    $version->blocks = ContractArticleBlockComposer::defaultBlocksFromVersionContent($version);
                    $version->save();
                    $updated++;
                } catch (Throwable $e) {
                    $this->error('Failed on version '.$version->id.': '.$e->getMessage());
                }
            }
        }, 'id');

        $this->info("Backfilled blocks on {$updated} version(s).");

        return self::SUCCESS;
    }
}
