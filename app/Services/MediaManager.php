<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\URL;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

final class MediaManager
{
    private function cdnUrl(): string
    {
        return rtrim((string) (config('media.cdn_url') ?: ''), '/');
    }

    private function signedExpirationMinutes(): int
    {
        return (int) config('media.signed_expiration_minutes', 10);
    }

    /**
     * Attach an uploaded file to a model's media collection.
     * Replaces existing single-file collection item when applicable.
     */
    public function attachToModel(HasMedia $model, UploadedFile $file, string $collection, bool $replaceSingle = true): Media
    {
        if ($replaceSingle) {
            $model->clearMediaCollection($collection);
        }

        return $model->addMedia($file)->toMediaCollection($collection);
    }

    /**
     * Delete a media item by model and id or by Media instance.
     */
    public function delete(Media $media): void
    {
        $media->delete();
    }

    /**
     * Get URL for a media item, optionally with conversion. Uses CDN if configured.
     */
    public function getUrl(Media $media, string $conversion = ''): string
    {
        $url = $conversion ? $media->getUrl($conversion) : $media->getUrl();
        $url = (string) $url;

        $cdn = $this->cdnUrl();
        if ($cdn !== '' && $url !== '' && str_starts_with($url, rtrim(config('app.url'), '/'))) {
            return str_replace(rtrim(config('app.url'), '/'), $cdn, $url);
        }

        return $url;
    }

    /**
     * Generate a temporary signed URL for secure access (e.g. 10 min expiry).
     */
    public function getTemporarySignedUrl(Media $media, string $conversion = '', ?int $minutes = null): string
    {
        $minutes ??= $this->signedExpirationMinutes();

        return URL::temporarySignedRoute(
            'media.temporary',
            now()->addMinutes($minutes),
            ['media' => $media->id],
            true
        );
    }

    /**
     * Get the first media URL for a model's collection (with optional conversion).
     */
    public function getFirstMediaUrl(HasMedia $model, string $collection, string $conversion = ''): ?string
    {
        $media = $model->getFirstMedia($collection);
        if (! $media) {
            return null;
        }

        return $this->getUrl($media, $conversion);
    }
}
