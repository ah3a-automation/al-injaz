/**
 * Display-only text formatters.
 * These NEVER modify stored values — only how text appears visually.
 */

/** ALL CAPS display */
export const displayUppercase = (value: string | null | undefined): string =>
    value?.toUpperCase() ?? '';

/** all lowercase display */
export const displayLowercase = (value: string | null | undefined): string =>
    value?.toLowerCase() ?? '';

/**
 * Capitalize each word, skipping short connectors.
 * Example: "al-rashid trading co." → "Al-Rashid Trading Co."
 */
const SKIP_WORDS = new Set([
    'of',
    'and',
    'the',
    'in',
    'at',
    'by',
    'for',
    'to',
    'a',
    'an',
    'or',
    'nor',
    'but',
    'so',
    'yet',
]);

export const displayTitleCase = (value: string | null | undefined): string => {
    if (!value) return '';
    return value
        .split(' ')
        .map((word, index) => {
            if (index !== 0 && SKIP_WORDS.has(word.toLowerCase())) return word.toLowerCase();
            return capitalizeFirst(word);
        })
        .join(' ');
};

function capitalizeFirst(word: string): string {
    if (!word) return '';
    return word
        .split('-')
        .map((part) => {
            if (!part) return '';
            // Keep short all-caps abbreviations like TT, IT, HR, LLC, CO, etc.
            if (part.length <= 3 && part === part.toUpperCase() && /^[A-Z]+$/.test(part)) {
                return part;
            }
            return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
        })
        .join('-');
}

