<?php

declare(strict_types=1);

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

final class MediaCleanupCommand extends Command
{
    protected $signature = 'media:cleanup
                            {--dry-run : List orphaned files without deleting}';

    protected $description = 'Remove orphaned media records (model no longer exists) and optionally clean disk';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');

        $media = Media::all();
        $orphaned = 0;

        foreach ($media as $medium) {
            $model = $medium->model;
            if ($model === null) {
                $orphaned++;
                $this->line(sprintf(
                    'Orphan: media id=%s collection=%s file=%s',
                    $medium->id,
                    $medium->collection_name,
                    $medium->file_name
                ));
                if (! $dryRun) {
                    $medium->delete();
                }
            }
        }

        if ($orphaned === 0) {
            $this->info('No orphaned media found.');
            return self::SUCCESS;
        }

        if ($dryRun) {
            $this->warn("Found {$orphaned} orphaned media record(s). Run without --dry-run to delete.");
        } else {
            $this->info("Deleted {$orphaned} orphaned media record(s).");
        }

        return self::SUCCESS;
    }
}
