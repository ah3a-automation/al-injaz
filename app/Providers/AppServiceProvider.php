<?php

declare(strict_types=1);

namespace App\Providers;

use App\Models\Project;
use App\Models\ProjectBoqItem;
use App\Models\SystemSetting;
use App\Observers\ProjectBoqItemObserver;
use App\Policies\ProjectPolicy;
use App\Services\ActivityLogger;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(ActivityLogger::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Gate::policy(Project::class, ProjectPolicy::class);
        ProjectBoqItem::observe(ProjectBoqItemObserver::class);
        Vite::prefetch(concurrency: 3);

        try {
            if (Schema::hasTable('system_settings')) {
                SystemSetting::applyMailConfig();
            }
        } catch (\Throwable $e) {
            // Silently fail during migrations or early boot
        }
    }
}
