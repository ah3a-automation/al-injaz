/**
 * WCAG 2.1 relative luminance and contrast ratio utilities.
 * Used for accessibility warnings on the branding/theme settings page.
 */

/**
 * Parse hex color to sRGB components (0–1).
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const match = hex.replace(/^#/, '').match(/^([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})$/);
    if (!match) return null;
    return {
        r: parseInt(match[1], 16) / 255,
        g: parseInt(match[2], 16) / 255,
        b: parseInt(match[3], 16) / 255,
    };
}

/**
 * WCAG 2.1 relative luminance (0 = black, 1 = white).
 * https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */
function relativeLuminance(r: number, g: number, b: number): number {
    const [rs, gs, bs] = [r, g, b].map((c) =>
        c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    );
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Contrast ratio of two hex colors (1:1 to 21:1).
 * WCAG 2.1: https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
 * A ratio below 4.5:1 is considered low contrast for normal text.
 *
 * @param hex1 - First color (e.g. background)
 * @param hex2 - Second color (e.g. text)
 * @returns Contrast ratio, or 0 if either color is invalid
 */
export function getContrastRatio(hex1: string, hex2: string): number {
    const rgb1 = hexToRgb(hex1);
    const rgb2 = hexToRgb(hex2);
    if (!rgb1 || !rgb2) return 0;
    const L1 = relativeLuminance(rgb1.r, rgb1.g, rgb1.b);
    const L2 = relativeLuminance(rgb2.r, rgb2.g, rgb2.b);
    const lighter = Math.max(L1, L2);
    const darker = Math.min(L1, L2);
    return (lighter + 0.05) / (darker + 0.05);
}
