import {
    confirmAction as confirmActionService,
    confirmDelete as confirmDeleteService,
} from '@/Services/confirm';

/**
 * Thin wrapper around confirm service for consistent import path and easier mocking in tests.
 */
export function useConfirm(): {
    confirmDelete: (message: string) => Promise<boolean>;
    confirmAction: (title: string, message: string) => Promise<boolean>;
} {
    return {
        confirmDelete: confirmDeleteService,
        confirmAction: confirmActionService,
    };
}
