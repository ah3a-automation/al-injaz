import Swal from 'sweetalert2';

/**
 * SweetAlert2 wrapper. This is the ONLY place Swal.fire() is called.
 * Use these functions for destructive confirmations and critical blocking alerts.
 */

export function confirmDelete(message: string): Promise<boolean> {
    return Swal.fire({
        title: 'Are you sure?',
        text: message,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Yes, delete',
    }).then((result) => Promise.resolve(result.isConfirmed));
}

export function confirmAction(
    title: string,
    message: string
): Promise<boolean> {
    return Swal.fire({
        title,
        text: message,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ca8a04',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Confirm',
    }).then((result) => Promise.resolve(result.isConfirmed));
}
