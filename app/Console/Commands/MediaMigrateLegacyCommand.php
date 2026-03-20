<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Supplier;
use App\Models\SupplierContact;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

final class MediaMigrateLegacyCommand extends Command
{
    protected $signature = 'media:migrate-legacy
                            {--dry-run : List what would be migrated without writing}';

    protected $description = 'Copy legacy path-based files (avatar_path, company_logo_path, etc.) into media library';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $disk = config('filesystems.default');

        $migrated = 0;

        foreach (User::all() as $user) {
            if (! $user->avatar_path) {
                continue;
            }
            $path = $user->avatar_path;
            if (! Storage::disk($disk)->exists($path)) {
                $this->warn("User {$user->id}: file missing: {$path}");
                continue;
            }
            if ($user->getFirstMedia('avatar')) {
                continue;
            }
            $this->line("User {$user->id}: migrating avatar");
            if (! $dryRun) {
                $fullPath = Storage::disk($disk)->path($path);
                if (is_file($fullPath)) {
                    $user->addMedia($fullPath)->preservingOriginal()->toMediaCollection('avatar');
                }
            }
            $migrated++;
        }

        foreach (Supplier::all() as $supplier) {
            if ($supplier->company_logo_path) {
                $path = $supplier->company_logo_path;
                if (Storage::disk($disk)->exists($path) && ! $supplier->getFirstMedia('company_logo')) {
                    $this->line("Supplier {$supplier->id}: migrating company logo");
                    if (! $dryRun) {
                        $fullPath = Storage::disk($disk)->path($path);
                        if (is_file($fullPath)) {
                            $supplier->addMedia($fullPath)->preservingOriginal()->toMediaCollection('company_logo');
                        }
                    }
                    $migrated++;
                }
            }
        }

        foreach (SupplierContact::all() as $contact) {
            foreach (['avatar_path' => 'avatar', 'business_card_front_path' => 'business_card_front', 'business_card_back_path' => 'business_card_back'] as $column => $collection) {
                $path = $contact->{$column};
                if (! $path || ! Storage::disk($disk)->exists($path) || $contact->getFirstMedia($collection)) {
                    continue;
                }
                $this->line("SupplierContact {$contact->id}: migrating {$collection}");
                if (! $dryRun) {
                    $fullPath = Storage::disk($disk)->path($path);
                    if (is_file($fullPath)) {
                        $contact->addMedia($fullPath)->preservingOriginal()->toMediaCollection($collection);
                    }
                }
                $migrated++;
            }
        }

        if ($dryRun) {
            $this->warn("Would migrate {$migrated} file(s). Run without --dry-run to apply.");
        } else {
            $this->info("Migrated {$migrated} file(s) to media library.");
        }

        return self::SUCCESS;
    }
}
