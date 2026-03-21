/** Helpers for task create/edit forms (datetime-local ↔ ISO, tags). */

export function parseTagsInput(input: string): string[] {
    return input
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .slice(0, 10);
}

/** `datetime-local` value from an ISO timestamp (task.reminder_at). */
export function toDatetimeLocalValue(iso: string | null | undefined): string {
    if (!iso) {
        return '';
    }
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
        return '';
    }
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** ISO string for Laravel `date` rule, or `undefined` to omit. */
export function fromDatetimeLocalToIso(local: string): string | undefined {
    const t = local.trim();
    if (t === '') {
        return undefined;
    }
    const d = new Date(t);
    if (Number.isNaN(d.getTime())) {
        return undefined;
    }
    return d.toISOString();
}
