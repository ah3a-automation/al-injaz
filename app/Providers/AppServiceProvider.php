<?php

declare(strict_types=1);

namespace App\Providers;

use App\Models\Project;
use App\Models\ProjectBoqItem;
use App\Models\SystemSetting;
use App\Notifications\Channels\AppMailChannel;
use App\Services\WhatsApp\EvolutionApiClient;
use App\Notifications\Channels\SmsChannel;
use App\Notifications\Channels\SystemNotificationChannel;
use App\Notifications\Channels\WhatsAppChannel;
use App\Observers\ProjectBoqItemObserver;
use App\Policies\ProjectPolicy;
use App\Services\ActivityLogger;
use Illuminate\Notifications\ChannelManager;
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
        $this->app->singleton(EvolutionApiClient::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $channels = $this->app->make(ChannelManager::class);

        $channels->extend('system', fn ($app) => $app->make(SystemNotificationChannel::class));
        // Delegates to SendEmailNotificationAction internally (see AppMailChannel).
        $channels->extend('app-mail', fn ($app) => $app->make(AppMailChannel::class));
        $channels->extend('whatsapp', fn ($app) => $app->make(WhatsAppChannel::class));
        $channels->extend('sms', fn ($app) => $app->make(SmsChannel::class));

        Gate::policy(Project::class, ProjectPolicy::class);
        ProjectBoqItem::observe(ProjectBoqItemObserver::class);
        Vite::prefetch(concurrency: 3);

        try {
            if (Schema::hasTable('system_settings')) {
                SystemSetting::applyMailConfig();
                SystemSetting::applyEvolutionConfig();
            }
        } catch (\Throwable $e) {
            // Silently fail during migrations or early boot
        }
    }
}
