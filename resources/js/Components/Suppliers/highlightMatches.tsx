import type { ReactNode } from 'react';

export type MatchIndices = readonly [number, number][];

/**
 * Splits text by Fuse.js match indices and wraps matched ranges in a highlight span.
 */
export function highlightMatches(text: string, indices?: MatchIndices): ReactNode[] {
    if (!indices || indices.length === 0) return [text];

    const parts: ReactNode[] = [];
    let lastIndex = 0;

    indices.forEach(([start, end], i) => {
        if (lastIndex < start) {
            parts.push(text.slice(lastIndex, start));
        }
        parts.push(
            <span key={i} className="rounded bg-yellow-200 px-0.5 dark:bg-yellow-600/50">
                {text.slice(start, end + 1)}
            </span>
        );
        lastIndex = end + 1;
    });

    if (lastIndex < text.length) {
        parts.push(text.slice(lastIndex));
    }

    return parts;
}
