import { router } from '@inertiajs/react'
import { useCallback, useEffect, useRef, useState } from 'react'

function normalizeValue<T>(v: T): T | undefined {
    if (v === '' || v === null || v === undefined) return undefined
    return v
}

function toFlatParams<T extends Record<string, unknown>>(
    obj: T
): Record<string, string | number | boolean> {
    const out: Record<string, string | number | boolean> = {}
    for (const [key, value] of Object.entries(obj)) {
        const normalized = normalizeValue(value)
        if (normalized !== undefined) {
            out[key] = normalized as string | number | boolean
        }
    }
    return out
}

export function useFilters<T extends Record<string, unknown>>(
    routeName: string,
    initialFilters: T,
    options?: { debounceMs?: number }
): {
    filters: T
    setFilter: <K extends keyof T>(key: K, value: T[K]) => void
    applyFilters: (overrides?: Partial<T>) => void
    resetFilters: () => void
} {
    const debounceMs = options?.debounceMs ?? 300
    const [filters, setFiltersState] = useState<T>(initialFilters)

    // Keep a ref that always has the latest filter values
    // This prevents stale closure bugs when applyFilters is called
    const filtersRef = useRef<T>(filters)
    useEffect(() => {
        filtersRef.current = filters
    }, [filters])

    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const applyFilters = useCallback(
        (overrides?: Partial<T>) => {
            // Always read from ref — never from stale closure state
            const current = filtersRef.current
            const merged = { ...current } as T
            if (overrides) {
                for (const key of Object.keys(overrides) as (keyof T)[]) {
                    if (key in overrides) {
                        (merged as Record<string, unknown>)[key as string] = overrides[key]
                    }
                }
            }
            const normalized = toFlatParams(merged as Record<string, unknown>)
            router.get(route(routeName) as string, normalized, {
                preserveState: true,
                replace: true,
            })
        },
        [routeName] // No longer depends on filters — reads from ref instead
    )

    const setFilter = useCallback(
        <K extends keyof T>(key: K, value: T[K]) => {
            setFiltersState((prev) => {
                const next = { ...prev, [key]: value } as T
                filtersRef.current = next // update ref immediately
                return next
            })

            if (key === 'q') {
                if (debounceTimerRef.current) {
                    clearTimeout(debounceTimerRef.current)
                    debounceTimerRef.current = null
                }
                debounceTimerRef.current = setTimeout(() => {
                    applyFilters({ q: value, page: 1 } as unknown as Partial<T>)
                    debounceTimerRef.current = null
                }, debounceMs)
            }
        },
        [debounceMs, applyFilters]
    )

    const resetFilters = useCallback(() => {
        setFiltersState(initialFilters)
        filtersRef.current = initialFilters
        const normalized = toFlatParams(initialFilters as Record<string, unknown>)
        router.get(route(routeName) as string, normalized, {
            preserveState: true,
            replace: true,
        })
    }, [initialFilters, routeName])

    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current)
                debounceTimerRef.current = null
            }
        }
    }, [])

    return { filters, setFilter, applyFilters, resetFilters }
}