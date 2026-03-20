<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Validation\ValidationException;
use Symfony\Component\Mime\MimeTypes;

/**
 * Validates file content using finfo (magic bytes) to detect real MIME type.
 * Rejects files where client-provided MIME does not match actual content.
 */
final class FileMimeValidationService
{
    /**
     * @param  array<string>  $allowedMimes  Allowed MIME types (e.g. ['application/pdf', 'image/jpeg'])
     * @param  array<string>|null  $allowedExtensions  Optional extensions to cross-check (e.g. ['pdf', 'jpg'])
     * @param  string  $attribute  Validation attribute name for error messages (default: 'file')
     */
    public function validate(UploadedFile $file, array $allowedMimes, ?array $allowedExtensions = null, string $attribute = 'file'): void
    {
        $clientMime = $file->getMimeType();
        $realMime = $this->getRealMimeType($file);

        if (! in_array($realMime, $allowedMimes, true)) {
            throw ValidationException::withMessages([
                $attribute => "File type not allowed. Detected: {$realMime}. Allowed: " . implode(', ', $allowedMimes) . '.',
            ]);
        }

        if ($clientMime !== null && $clientMime !== '' && $clientMime !== $realMime) {
            throw ValidationException::withMessages([
                $attribute => "File content does not match declared type. Declared: {$clientMime}, detected: {$realMime}.",
            ]);
        }

        if ($allowedExtensions !== null) {
            $ext = strtolower($file->getClientOriginalExtension() ?: '');
            $mimeTypes = new MimeTypes();
            $extensionsForMime = $mimeTypes->getExtensions($realMime);
            $extValid = $ext !== '' && in_array($ext, $allowedExtensions, true);
            $mimeExtValid = $extensionsForMime !== [] && in_array($ext, $extensionsForMime, true);
            if (! $extValid && ! $mimeExtValid) {
                throw ValidationException::withMessages([
                    $attribute => "File extension does not match content. Allowed: " . implode(', ', $allowedExtensions) . '.',
                ]);
            }
        }
    }

    /**
     * Detect real MIME type from file content using finfo.
     */
    public function getRealMimeType(UploadedFile $file): string
    {
        $path = $file->getRealPath();
        if ($path === false || ! is_readable($path)) {
            return 'application/octet-stream';
        }

        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        if ($finfo === false) {
            return 'application/octet-stream';
        }

        $mime = finfo_file($finfo, $path);
        finfo_close($finfo);

        return is_string($mime) && $mime !== '' ? $mime : 'application/octet-stream';
    }
}
