<?php

declare(strict_types=1);

namespace App\Models;

use App\Eloquent\Relations\MorphManyWithStringKey;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;
use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable implements HasMedia
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, InteractsWithMedia, Notifiable, HasRoles, SoftDeletes;

    public const STATUS_ACTIVE = 'active';

    public const STATUS_INACTIVE = 'inactive';

    public const STATUS_SUSPENDED = 'suspended';

    public const ROLE_SUPPLIER = 'supplier';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'phone',
        'department',
        'status',
        'must_change_password',
        'last_login_at',
        'created_by_user_id',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'must_change_password' => 'boolean',
            'last_login_at' => 'datetime',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function createdUsers(): HasMany
    {
        return $this->hasMany(User::class, 'created_by_user_id');
    }

    public function supplierProfile(): HasOne
    {
        return $this->hasOne(Supplier::class, 'supplier_user_id');
    }

    public function watchlistedSuppliers(): BelongsToMany
    {
        return $this->belongsToMany(Supplier::class, 'supplier_watchlists')
            ->withPivot('notes')
            ->withTimestamps(false);
    }

    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE;
    }

    public function isSuspended(): bool
    {
        return $this->status === self::STATUS_SUSPENDED;
    }

    public function getDisplayRoleAttribute(): string
    {
        return $this->roles->first()?->name ?? 'No Role';
    }

    public function unreadNotificationCount(): int
    {
        return (int) $this->unreadNotifications()->count();
    }

    /**
     * Per-event channel toggles (opt-out only; missing rows inherit template defaults).
     *
     * @return HasMany<UserNotificationPreference, User>
     */
    public function notificationPreferences(): HasMany
    {
        return $this->hasMany(UserNotificationPreference::class);
    }

    /**
     * Media relation with string model_id so PostgreSQL varchar column compares correctly to User's integer id.
     */
    public function media(): \Illuminate\Database\Eloquent\Relations\MorphMany
    {
        return new MorphManyWithStringKey(
            $this->newRelatedInstance(Media::class)->newQuery(),
            $this,
            'model_type',
            'model_id',
            $this->getKeyName()
        );
    }

    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('avatar')->singleFile();
    }

    public function registerMediaConversions(?Media $media = null): void
    {
        $this->addMediaConversion('thumb')
            ->performOnCollections('avatar')
            ->width(100)
            ->height(100)
            ->format('webp')
            ->optimize();

        $this->addMediaConversion('preview')
            ->performOnCollections('avatar')
            ->width(300)
            ->height(300)
            ->format('webp')
            ->optimize();
    }
}
