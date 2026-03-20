/**
 * File size limits for Supplier Portal contact avatar and business card uploads.
 * Aligned with backend: ContactController::IMAGE_MAX_KB = 2048 (2 MB).
 */
const MB = 1024 * 1024;

export const MAX_AVATAR_SIZE_BYTES = 2 * MB;
export const MAX_BUSINESS_CARD_SIZE_BYTES = 2 * MB;

export function isAvatarWithinLimit(file: File): boolean {
    return file.size <= MAX_AVATAR_SIZE_BYTES;
}

export function isBusinessCardWithinLimit(file: File): boolean {
    return file.size <= MAX_BUSINESS_CARD_SIZE_BYTES;
}
