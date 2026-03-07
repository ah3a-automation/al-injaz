import type { Task } from '@/types';

export function isOverdue(task: Task): boolean {
    if (!task.due_at) return false;
    if (task.status === 'done' || task.status === 'cancelled') return false;
    return new Date(task.due_at) < new Date();
}
