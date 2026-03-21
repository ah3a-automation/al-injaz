<?php

declare(strict_types=1);

namespace Tests;

use App\Models\NotificationRecipient;
use App\Models\NotificationSetting;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Str;
use Spatie\Permission\PermissionRegistrar;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Spatie caches permissions in memory; RefreshDatabase wipes the DB but not this cache,
        // so findOrCreate() can return stale ids and role_has_permissions inserts fail (FK).
        $this->app->make(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    /**
     * Persist a notification setting with a known UUID so $model->id is always set
     * (NotificationSetting does not mass-assign id; plain create() can leave id null in tests).
     */
    protected function createNotificationSetting(array $attributes): NotificationSetting
    {
        if (! isset($attributes['id'])) {
            $attributes['id'] = (string) Str::uuid();
        }

        return NotificationSetting::forceCreate($attributes);
    }

    /**
     * Persist a notification recipient with a known UUID (same pattern as {@see createNotificationSetting}).
     */
    protected function createNotificationRecipient(array $attributes): NotificationRecipient
    {
        if (! isset($attributes['id'])) {
            $attributes['id'] = (string) Str::uuid();
        }

        return NotificationRecipient::forceCreate($attributes);
    }
}
