import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY_COLLAPSED = 'sidebarCollapsed';
const STORAGE_KEY_PINNED = 'sidebarPinned';

function readStored(key: string, fallback: boolean): boolean {
    if (typeof window === 'undefined') return fallback;
    try {
        const raw = localStorage.getItem(key);
        if (raw === null) return fallback;
        return raw === 'true';
    } catch {
        return fallback;
    }
}

function writeStored(key: string, value: boolean): void {
    try {
        localStorage.setItem(key, value ? 'true' : 'false');
    } catch {
        // ignore
    }
}

const WIDTH_EXPANDED = 240;
const WIDTH_COLLAPSED = 56;

export interface SidebarContextValue {
    collapsed: boolean;
    toggle: () => void;
    width: number;
    /** Reserved for future hover-expand: when true, sidebar is temporarily expanded by hover (not yet used). */
    hoverExpanded: boolean;
    setHoverExpanded: (value: boolean) => void;
    /** When true, sidebar stays expanded (e.g. cannot auto-collapse). */
    pinned: boolean;
    setPinned: (value: boolean) => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
    const [collapsed, setCollapsed] = useState(false);
    const [hoverExpanded, setHoverExpanded] = useState(false);
    const [pinned, setPinnedState] = useState(false);

    useEffect(() => {
        setCollapsed(readStored(STORAGE_KEY_COLLAPSED, false));
        setPinnedState(readStored(STORAGE_KEY_PINNED, false));
    }, []);

    const setPinned = useCallback((value: boolean) => {
        setPinnedState(value);
        writeStored(STORAGE_KEY_PINNED, value);
    }, []);

    const toggle = useCallback(() => {
        setCollapsed((prev) => {
            const next = !prev;
            writeStored(STORAGE_KEY_COLLAPSED, next);
            return next;
        });
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key.toLowerCase() === 'b') {
                e.preventDefault();
                toggle();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [toggle]);

    const width = collapsed ? WIDTH_COLLAPSED : WIDTH_EXPANDED;

    const value = useMemo<SidebarContextValue>(
        () => ({ collapsed, toggle, width, hoverExpanded, setHoverExpanded, pinned, setPinned }),
        [collapsed, toggle, width, hoverExpanded, pinned, setPinned]
    );

    return (
        <SidebarContext.Provider value={value}>
            {children}
        </SidebarContext.Provider>
    );
}

export function useSidebar(): SidebarContextValue {
    const ctx = useContext(SidebarContext);
    if (!ctx) {
        throw new Error('useSidebar must be used within SidebarProvider');
    }
    return ctx;
}
